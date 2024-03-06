module;

#include <llvm/IR/IRBuilder.h>
#include "llvm/IR/LegacyPassManager.h"
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/PassManager.h>
#include <llvm/IR/Verifier.h>
#include <llvm/MC/TargetRegistry.h>
#include <llvm/Passes/PassBuilder.h>
#include <llvm/Support/FileSystem.h>
#include <llvm/Support/Host.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Target/TargetMachine.h>
#include <llvm/Target/TargetOptions.h>

#include <bit>
#include <cstdlib>
#include <format>
#include <iostream>
#include <filesystem>
#include <memory>
#include <memory_resource>
#include <optional>
#include <ranges>
#include <span>
#include <string_view>
#include <unordered_map>
#include <variant>
#include <vector>

module h.compiler;

import h.core;
import h.json_serializer;

namespace h::compiler
{
    std::optional<Module_pair const*> get_module(std::span<Module_pair const> const modules, std::string_view const name)
    {
        auto const location = std::find_if(modules.begin(), modules.end(), [name](Module_pair const& module) { return module.core_module.name == name; });
        if (location == modules.end())
            return std::nullopt;

        return &(*location);
    }

    std::optional<std::string_view> get_module_name_from_alias(Module const& module, std::string_view const alias_name)
    {
        auto const location = std::find_if(module.dependencies.alias_imports.begin(), module.dependencies.alias_imports.end(), [alias_name](Import_module_with_alias const& import) { return import.alias == alias_name; });
        if (location == module.dependencies.alias_imports.end())
            return std::nullopt;

        return location->module_name;
    }

    std::optional<Function_declaration const*> find_function_declaration(Module const& module, std::string_view const name)
    {
        auto const find_declaration = [name](Function_declaration const& declaration) { return declaration.name == name; };

        {
            auto const location = std::find_if(module.export_declarations.function_declarations.begin(), module.export_declarations.function_declarations.end(), find_declaration);
            if (location != module.export_declarations.function_declarations.end())
                return &(*location);
        }

        {
            auto const location = std::find_if(module.internal_declarations.function_declarations.begin(), module.internal_declarations.function_declarations.end(), find_declaration);
            if (location != module.internal_declarations.function_declarations.end())
                return &(*location);
        }

        return {};
    }

    Struct_types create_struct_types(llvm::LLVMContext& llvm_context)
    {
        llvm::Type* int8_pointer_type = llvm::Type::getInt8PtrTy(llvm_context);
        llvm::Type* int64_type = llvm::Type::getInt64Ty(llvm_context);

        llvm::StructType* string_type = llvm::StructType::create({ int8_pointer_type, int64_type }, "__hl_string");

        return Struct_types
        {
            .string = string_type
        };
    }

    template<typename T>
    concept Has_name = requires(T a)
    {
        { a.name } -> std::convertible_to<std::pmr::string>;
    };

    template<Has_name Type>
    std::pmr::unordered_map<std::pmr::string, std::size_t> create_name_to_index_map(
        std::span<Type const> const values,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::unordered_map<std::pmr::string, std::size_t> map{ output_allocator };
        map.reserve(values.size());

        for (std::size_t index = 0; index < values.size(); ++index)
        {
            Type const& declaration = values[index];
            map.insert(std::make_pair(declaration.name, index));
        }

        return map;
    }

    template<Has_name Type>
    Type const& get_value(
        std::string_view const name,
        std::span<Type const> const values
    )
    {
        auto location = std::find_if(values.begin(), values.end(), [name](Type const& value) { return value.name == name; });
        return *location;
    }


    llvm::Type* to_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Type_reference const& type,
        Struct_types const& struct_types
    );

    llvm::Type* to_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Fundamental_type const type,
        Struct_types const& struct_types
    )
    {
        switch (type)
        {
        case Fundamental_type::Bool:
            return llvm::Type::getInt1Ty(llvm_context);
        case Fundamental_type::Byte:
            return llvm::Type::getInt8Ty(llvm_context);
        case Fundamental_type::Float16:
            return llvm::Type::getHalfTy(llvm_context);
        case Fundamental_type::Float32:
            return llvm::Type::getFloatTy(llvm_context);
        case Fundamental_type::Float64:
            return llvm::Type::getDoubleTy(llvm_context);
        case Fundamental_type::String:
            return struct_types.string;
        case Fundamental_type::C_bool:
        case Fundamental_type::C_char:
        case Fundamental_type::C_schar:
        case Fundamental_type::C_uchar:
            return llvm_data_layout.getSmallestLegalIntType(llvm_context, 8);
        case Fundamental_type::C_short:
        case Fundamental_type::C_ushort:
            return llvm_data_layout.getSmallestLegalIntType(llvm_context, 16);
        case Fundamental_type::C_int:
        case Fundamental_type::C_uint:
        case Fundamental_type::C_long:
        case Fundamental_type::C_ulong:
            return llvm_data_layout.getSmallestLegalIntType(llvm_context, 32);
        case Fundamental_type::C_longlong:
        case Fundamental_type::C_ulonglong:
            return llvm_data_layout.getSmallestLegalIntType(llvm_context, 64);
        default:
            throw std::runtime_error{ "Not implemented." };
        }
    }

    llvm::Type* to_type(
        llvm::LLVMContext& llvm_context,
        Integer_type const type
    )
    {
        return llvm::Type::getIntNTy(llvm_context, type.number_of_bits);
    }

    llvm::Type* to_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Pointer_type const type,
        Struct_types const& struct_types
    )
    {
        llvm::Type* pointed_type = !type.element_type.empty() ? to_type(llvm_context, llvm_data_layout, type.element_type[0], struct_types) : llvm::Type::getVoidTy(llvm_context);
        return pointed_type->getPointerTo();
    }

    llvm::Type* to_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Type_reference const& type,
        Struct_types const& struct_types
    )
    {
        llvm::Type* llvm_type = nullptr;

        auto const create_type = [&](auto&& data) -> void
        {
            using Subtype = std::decay_t<decltype(data)>;

            llvm_type = [&]() -> llvm::Type*
            {
                if constexpr (std::is_same_v<Subtype, Builtin_type_reference>)
                {
                    throw std::runtime_error{ "Not implemented." };
                }
                else if constexpr (std::is_same_v<Subtype, Constant_array_type>)
                {
                    throw std::runtime_error{ "Not implemented." };
                }
                else if constexpr (std::is_same_v<Subtype, Custom_type_reference>)
                {
                    throw std::runtime_error{ "Not implemented." };
                }
                else if constexpr (std::is_same_v<Subtype, Fundamental_type>)
                {
                    return to_type(llvm_context, llvm_data_layout, data, struct_types);
                }
                else if constexpr (std::is_same_v<Subtype, Function_type>)
                {
                    throw std::runtime_error{ "Not implemented." };
                }
                else if constexpr (std::is_same_v<Subtype, Integer_type>)
                {
                    return to_type(llvm_context, data);
                }
                else if constexpr (std::is_same_v<Subtype, Pointer_type>)
                {
                    return to_type(llvm_context, llvm_data_layout, data, struct_types);
                }
                else
                {
                    static_assert(always_false_v<Subtype>, "Not implemented.");
                }
            }();
        };

        std::visit(create_type, type.data);

        return llvm_type;
    }

    std::pmr::vector<llvm::Type*> to_types(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::span<Type_reference const> const type_references,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<llvm::Type*> output{ output_allocator };
        output.resize(type_references.size());

        std::transform(
            type_references.begin(),
            type_references.end(),
            output.begin(),
            [&](Type_reference const& type_reference) -> llvm::Type* { return to_type(llvm_context, llvm_data_layout, type_reference, struct_types); }
        );

        return output;
    }

    Type_reference create_pointer_type_type_reference(std::pmr::vector<Type_reference> element_type, bool const is_mutable)
    {
        Pointer_type pointer_type
        {
            .element_type = std::move(element_type),
            .is_mutable = is_mutable
        };

        return Type_reference
        {
            .data = std::move(pointer_type)
        };
    }

    std::optional<Type_reference> remove_pointer(Type_reference const& type)
    {
        if (std::holds_alternative<Pointer_type>(type.data))
        {
            Pointer_type const& pointer_type = std::get<Pointer_type>(type.data);
            if (pointer_type.element_type.empty())
                return {};

            return pointer_type.element_type.front();
        }

        throw std::runtime_error("Type is not a pointer type!");
    }

    bool is_integer(Type_reference const& type)
    {
        return std::holds_alternative<Integer_type>(type.data);
    }

    bool is_signed_integer(Type_reference const& type)
    {
        if (std::holds_alternative<Integer_type>(type.data))
        {
            Integer_type const& data = std::get<Integer_type>(type.data);
            return data.is_signed;
        }

        return false;
    }

    bool is_unsigned_integer(Type_reference const& type)
    {
        return !is_signed_integer(type);
    }

    bool is_bool(Type_reference const& type)
    {
        if (std::holds_alternative<Fundamental_type>(type.data))
        {
            Fundamental_type const data = std::get<Fundamental_type>(type.data);
            return data == Fundamental_type::Bool;
        }

        return false;
    }

    bool is_floating_point(Type_reference const& type)
    {
        if (std::holds_alternative<Fundamental_type>(type.data))
        {
            Fundamental_type const data = std::get<Fundamental_type>(type.data);
            return (data == Fundamental_type::Float16) || (data == Fundamental_type::Float32) || (data == Fundamental_type::Float64);
        }

        return false;
    }

    llvm::GlobalValue::LinkageTypes to_linkage(
        Linkage const linkage
    )
    {
        switch (linkage)
        {
        case Linkage::External:
            return llvm::GlobalValue::LinkageTypes::ExternalLinkage;
        case Linkage::Private:
            return llvm::GlobalValue::LinkageTypes::PrivateLinkage;
        default:
            throw;
        }
    }

    llvm::FunctionType* to_function_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::span<Type_reference const> const input_parameter_types,
        std::span<Type_reference const> const output_parameter_types,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<llvm::Type*> const llvm_input_parameter_types = to_types(llvm_context, llvm_data_layout, input_parameter_types, struct_types, temporaries_allocator);
        std::pmr::vector<llvm::Type*> const llvm_output_parameter_types = to_types(llvm_context, llvm_data_layout, output_parameter_types, struct_types, temporaries_allocator);

        llvm::Type* llvm_return_type = [&]() -> llvm::Type*
        {
            if (llvm_output_parameter_types.size() == 0)
                return llvm::Type::getVoidTy(llvm_context);

            if (llvm_output_parameter_types.size() == 1)
                return llvm_output_parameter_types.front();

            return llvm::StructType::create(llvm_output_parameter_types);
        }();

        return llvm::FunctionType::get(llvm_return_type, llvm_input_parameter_types, false);
    }

    llvm::Function& to_function(
        llvm::FunctionType& llvm_function_type,
        Function_declaration const& function_declaration
    )
    {
        llvm::GlobalValue::LinkageTypes const linkage = to_linkage(function_declaration.linkage);

        llvm::Function* const llvm_function = llvm::Function::Create(
            &llvm_function_type,
            linkage,
            function_declaration.name.c_str(),
            nullptr
        );

        if (!llvm_function)
        {
            throw std::runtime_error{ "Could not create function." };
        }

        if (llvm_function->arg_size() != function_declaration.input_parameter_names.size())
        {
            throw std::runtime_error{ "Function arguments size and provided argument names size do not match." };
        }

        for (unsigned argument_index = 0; argument_index < llvm_function->arg_size(); ++argument_index)
        {
            llvm::Argument* const argument = llvm_function->getArg(argument_index);
            std::pmr::string const& name = function_declaration.input_parameter_names[argument_index];
            argument->setName(name.c_str());
        }

        llvm_function->setCallingConv(llvm::CallingConv::C);

        return *llvm_function;
    }

    struct Value_and_type
    {
        llvm::Value* value;
        std::optional<Type_reference> type;
    };

    Value_and_type create_value(
        Module const& core_module,
        Statement const& statement,
        Access_expression const& expression,
        std::span<Value_and_type const> const temporaries,
        std::span<Module_pair const> const module_dependencies
    )
    {
        Value_and_type const& left_hand_side = temporaries[expression.expression.expression_index];

        // Check if left hand side corresponds to a module name:
        if (left_hand_side.value == nullptr)
        {
            Expression const& left_hand_side_expression = statement.expressions[expression.expression.expression_index];

            if (std::holds_alternative<Variable_expression>(left_hand_side_expression.data))
            {
                Variable_expression const& variable_expression = std::get<Variable_expression>(left_hand_side_expression.data);
                std::string_view const module_alias_name = variable_expression.name;

                std::optional<std::string_view> const module_name = get_module_name_from_alias(core_module, module_alias_name);
                if (!module_name.has_value())
                    throw std::runtime_error{ std::format("Undefined variable '{}'", module_alias_name) };

                std::optional<Module_pair const*> external_module = get_module(module_dependencies, module_name.value());
                if (!external_module.has_value())
                    throw std::runtime_error{ std::format("Module '{}' does not exist", module_name.value()) };

                // TODO try to find alias/enum/struct:
                llvm::Function* const llvm_function = external_module.value()->llvm_module->getFunction(expression.member_name.c_str());
                if (!llvm_function)
                    throw std::runtime_error{ std::format("Unknown function '{}.{}' referenced.", module_name.value(), expression.member_name.c_str()) };

                std::optional<Function_declaration const*> function_declaration = find_function_declaration(external_module.value()->core_module, expression.member_name.c_str());
                std::pmr::vector<Type_reference> const& output_parameter_types = function_declaration.value()->type.output_parameter_types;

                return Value_and_type
                {
                    .value = llvm_function,
                    .type = output_parameter_types.empty() ? std::optional<Type_reference>{} : output_parameter_types.front() // TODO type is function type, not output of function
                };
            }
        }

        // TODO enum / struct access
        return
        {
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_binary_operation_instruction(
        llvm::IRBuilder<>& llvm_builder,
        Value_and_type const& left_hand_side,
        Value_and_type const& right_hand_side,
        Binary_operation operation
    );

    Value_and_type create_value(
        Assignment_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types
    )
    {
        Value_and_type const left_hand_side = temporaries[expression.left_hand_side.expression_index];
        Value_and_type const right_hand_side = temporaries[expression.right_hand_side.expression_index];

        if (expression.additional_operation.has_value())
        {
            Binary_operation const additional_operation = expression.additional_operation.value();

            Type_reference const core_element_type = remove_pointer(left_hand_side.type.value()).value();
            llvm::Type* llvm_element_type = to_type(llvm_context, llvm_data_layout, core_element_type, struct_types);
            llvm::Value* const loaded_value_value = llvm_builder.CreateLoad(llvm_element_type, left_hand_side.value);

            Value_and_type const loaded_value
            {
                .value = loaded_value_value,
                .type = remove_pointer(left_hand_side.type.value()).value()
            };

            Value_and_type const result = create_binary_operation_instruction(llvm_builder, loaded_value, right_hand_side, additional_operation);

            llvm::Value* store_instruction = llvm_builder.CreateStore(result.value, left_hand_side.value);

            return
            {
                .value = store_instruction,
                .type = std::nullopt
            };
        }
        else
        {
            llvm::Value* store_instruction = llvm_builder.CreateStore(right_hand_side.value, left_hand_side.value);

            return
            {
                .value = store_instruction,
                .type = std::nullopt
            };
        }
    }

    Value_and_type create_binary_operation_instruction(
        llvm::IRBuilder<>& llvm_builder,
        Value_and_type const& left_hand_side,
        Value_and_type const& right_hand_side,
        Binary_operation const operation
    )
    {
        if (!left_hand_side.type.has_value() || !right_hand_side.type.has_value())
            throw std::runtime_error{ "Left or right side type is null!" };

        if (left_hand_side.type.value() != right_hand_side.type.value())
            throw std::runtime_error{ "Left and right side types do not match!" };

        Type_reference const& type = left_hand_side.type.value();

        switch (operation)
        {
        case Binary_operation::Add: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateAdd(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFAdd(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Subtract: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateSub(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFSub(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Multiply: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateMul(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFMul(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Divide: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateSDiv(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateUDiv(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFDiv(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Modulus: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateSRem(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateURem(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFRem(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Equal: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateICmpEQ(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFCmpOEQ(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Not_equal: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateICmpNE(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFCmpONE(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Less_than: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpSLT(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpULT(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFCmpOLT(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Less_than_or_equal_to: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpSLE(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpULE(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFCmpOLE(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Greater_than: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpSGT(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpUGT(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFCmpOGT(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Greater_than_or_equal_to: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpSGE(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateICmpUGE(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateFCmpOGE(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Logical_and: {
            return Value_and_type
            {
                .value = llvm_builder.CreateAnd(left_hand_side.value, right_hand_side.value),
                .type = type
            };
        }
        case Binary_operation::Logical_or: {
            return Value_and_type
            {
                .value = llvm_builder.CreateOr(left_hand_side.value, right_hand_side.value),
                .type = type
            };
        }
        case Binary_operation::Bitwise_and: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateAnd(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bitwise_or: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateOr(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bitwise_xor: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateXor(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bit_shift_left: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .value = llvm_builder.CreateShl(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Bit_shift_right: {
            if (is_integer(type))
            {
                if (is_signed_integer(type))
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateAShr(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .value = llvm_builder.CreateLShr(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            break;
        }
        }

        throw std::runtime_error{ std::format("Binary operation '{}' not implemented!", static_cast<std::uint32_t>(operation)) };
    }

    Value_and_type create_value(
        Binary_expression const& expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type const& left_hand_side = temporaries[expression.left_hand_side.expression_index];
        Value_and_type const& right_hand_side = temporaries[expression.right_hand_side.expression_index];
        Binary_operation const operation = expression.operation;

        Value_and_type value = create_binary_operation_instruction(llvm_builder, left_hand_side, right_hand_side, operation);
        return value;
    }

    Value_and_type create_value(
        Module const& core_module,
        Call_expression const& expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        std::span<Module_pair const> const module_dependencies,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Value_and_type const& left_hand_side = temporaries[expression.expression.expression_index];

        if (!llvm::Function::classof(left_hand_side.value))
            throw std::runtime_error{ std::format("Left hand side of call expression is not a function!") };

        llvm::Function* const llvm_function = static_cast<llvm::Function*>(left_hand_side.value);

        if (expression.arguments.size() != llvm_function->arg_size())
        {
            throw std::runtime_error{ "Incorrect # arguments passed." };
        }

        std::pmr::vector<llvm::Value*> llvm_arguments{ temporaries_allocator };
        llvm_arguments.resize(expression.arguments.size());

        for (unsigned i = 0; i < expression.arguments.size(); ++i)
        {
            std::uint64_t const expression_index = expression.arguments[i].expression_index;
            Value_and_type const temporary = temporaries[expression_index];

            llvm_arguments[i] = temporary.value;
        }

        llvm::Value* call_instruction = llvm_builder.CreateCall(llvm_function, llvm_arguments);

        return
        {
            .value = call_instruction,
            .type = left_hand_side.type // TODO get output type
        };
    }

    llvm::Instruction::CastOps get_cast_type(
        Type_reference const& source_core_type,
        llvm::Type const& source_llvm_type,
        Type_reference const& destination_core_type,
        llvm::Type const& destination_llvm_type
    )
    {
        if (source_llvm_type.isIntegerTy())
        {
            if (destination_llvm_type.isIntegerTy())
            {
                // Both are integers

                bool const is_source_larger = source_llvm_type.getIntegerBitWidth() > destination_llvm_type.getIntegerBitWidth();

                if (is_source_larger)
                {
                    return llvm::Instruction::CastOps::Trunc;
                }
                else
                {
                    Integer_type const& source_integer_type = std::get<Integer_type>(source_core_type.data);
                    Integer_type const& destination_integer_type = std::get<Integer_type>(destination_core_type.data);

                    if (source_integer_type.is_signed && destination_integer_type.is_signed)
                        return llvm::Instruction::CastOps::SExt;
                    else
                        return llvm::Instruction::CastOps::ZExt;
                }
            }
            else if (destination_llvm_type.isHalfTy() || destination_llvm_type.isFloatTy() || destination_llvm_type.isDoubleTy())
            {
                // Source is integer, destination is floating point

                Integer_type const& source_integer_type = std::get<Integer_type>(source_core_type.data);

                if (source_integer_type.is_signed)
                    return llvm::Instruction::CastOps::SIToFP;
                else
                    return llvm::Instruction::CastOps::UIToFP;
            }
        }
        else if (source_llvm_type.isHalfTy() || source_llvm_type.isFloatTy() || source_llvm_type.isDoubleTy())
        {
            if (destination_llvm_type.isIntegerTy())
            {
                // Source is floating point, destination is integer

                Integer_type const& destination_integer_type = std::get<Integer_type>(destination_core_type.data);

                if (destination_integer_type.is_signed)
                    return llvm::Instruction::CastOps::FPToSI;
                else
                    return llvm::Instruction::CastOps::FPToUI;
            }
            else if (destination_llvm_type.isHalfTy() || destination_llvm_type.isFloatTy() || destination_llvm_type.isDoubleTy())
            {
                // Both are floating point

                bool const is_source_larger = source_llvm_type.getFPMantissaWidth() > destination_llvm_type.getFPMantissaWidth();

                if (is_source_larger)
                    return llvm::Instruction::CastOps::FPTrunc;
                else
                    return llvm::Instruction::CastOps::FPExt;
            }
        }

        throw std::runtime_error{ std::format("Invalid cast!") };
    }

    Value_and_type create_value(
        Module const& core_module,
        Cast_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        std::span<Module_pair const> const module_dependencies,
        Struct_types const& struct_types
    )
    {
        Value_and_type const source = temporaries[expression.source.expression_index];

        llvm::Type* const source_llvm_type = source.value->getType();
        llvm::Type* const destination_llvm_type = to_type(llvm_context, llvm_data_layout, expression.destination_type, struct_types);

        // If types are equal, then ignore the cast:
        if (source_llvm_type == destination_llvm_type)
            return source;

        llvm::Instruction::CastOps const cast_type = get_cast_type(source.type.value(), *source_llvm_type, expression.destination_type, *destination_llvm_type);

        llvm::Value* const cast_instruction = llvm_builder.CreateCast(cast_type, source.value, destination_llvm_type);

        return
        {
            .value = cast_instruction,
            .type = expression.destination_type
        };
    }

    bool is_c_string(Type_reference const& type_reference)
    {
        if (std::holds_alternative<Pointer_type>(type_reference.data))
        {
            Pointer_type const& pointer_type = std::get<Pointer_type>(type_reference.data);

            if (!pointer_type.element_type.empty())
            {
                Type_reference const& value_type = pointer_type.element_type[0];
                if (std::holds_alternative<Fundamental_type>(value_type.data))
                {
                    Fundamental_type const fundamental_type = std::get<Fundamental_type>(value_type.data);
                    if (fundamental_type == Fundamental_type::C_char)
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    Value_and_type create_value(
        Constant_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Struct_types const& struct_types
    )
    {
        if (std::holds_alternative<Fundamental_type>(expression.type.data))
        {
            Fundamental_type const fundamental_type = std::get<Fundamental_type>(expression.type.data);

            switch (fundamental_type)
            {
            case Fundamental_type::Bool: {
                llvm::Type* const llvm_type = to_type(llvm_context, llvm_data_layout, expression.type, struct_types);

                std::uint8_t const data = expression.data == "true" ? 1 : 0;
                llvm::APInt const value{ 1, data, false };

                llvm::Value* const instruction = llvm::ConstantInt::get(llvm_type, value);

                return
                {
                    .value = instruction,
                    .type = expression.type
                };
            }
            case Fundamental_type::Float16: {
                llvm::Type* const llvm_type = to_type(llvm_context, llvm_data_layout, expression.type, struct_types);

                char* end;
                float const value = std::strtof(expression.data.c_str(), &end);

                llvm::Value* const instruction = llvm::ConstantFP::get(llvm_type, value);

                return
                {
                    .value = instruction,
                    .type = expression.type
                };
            }
            case Fundamental_type::Float32: {
                llvm::Type* const llvm_type = to_type(llvm_context, llvm_data_layout, expression.type, struct_types);

                char* end;
                float const value = std::strtof(expression.data.c_str(), &end);

                llvm::Value* const instruction = llvm::ConstantFP::get(llvm_type, value);

                return
                {
                    .value = instruction,
                    .type = expression.type
                };
            }
            case Fundamental_type::Float64: {
                llvm::Type* const llvm_type = to_type(llvm_context, llvm_data_layout, expression.type, struct_types);

                char* end;
                double const value = std::strtod(expression.data.c_str(), &end);

                llvm::Value* const instruction = llvm::ConstantFP::get(llvm_type, value);

                return
                {
                    .value = instruction,
                    .type = expression.type
                };
            }
            default:
                break;
            }
        }
        else if (std::holds_alternative<Integer_type>(expression.type.data))
        {
            Integer_type const& integer_type = std::get<Integer_type>(expression.type.data);

            llvm::Type* const llvm_type = to_type(llvm_context, llvm_data_layout, expression.type, struct_types);

            char* end;
            std::uint64_t const data = std::strtoull(expression.data.c_str(), &end, 10);
            llvm::APInt const value{ integer_type.number_of_bits, data, integer_type.is_signed };

            llvm::Value* const instruction = llvm::ConstantInt::get(llvm_type, value);

            return
            {
                .value = instruction,
                .type = expression.type
            };
        }
        else if (is_c_string(expression.type))
        {
            std::pmr::string const& string_data = expression.data;

            std::uint64_t const null_terminator_size = 1;
            std::uint64_t const array_size = string_data.size() + null_terminator_size;
            llvm::ArrayType* const array_type = llvm::ArrayType::get(llvm::IntegerType::get(llvm_context, 8), array_size);

            bool const is_constant = true;
            std::string const global_variable_name = std::format("global_{}", llvm_module.global_size());
            llvm::GlobalVariable* const global_variable = new llvm::GlobalVariable(
                llvm_module,
                array_type,
                is_constant,
                llvm::GlobalValue::InternalLinkage,
                llvm::ConstantDataArray::getString(llvm_context, string_data.c_str()),
                global_variable_name
            );

            llvm::Value* const instruction = global_variable;

            return
            {
                .value = instruction,
                .type = expression.type
            };
        }

        throw std::runtime_error{ "Constant expression not handled!" };
    }

    Value_and_type create_value(
        Return_expression const& expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type const temporary = temporaries[expression.expression.expression_index];

        llvm::Value* const instruction = llvm_builder.CreateRet(temporary.value);

        return
        {
            .value = instruction,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Variable_declaration_expression const& expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type const right_hand_side = temporaries[expression.right_hand_side.expression_index];

        llvm::Value* const alloca = llvm_builder.CreateAlloca(right_hand_side.value->getType(), nullptr, expression.name.c_str());

        llvm_builder.CreateStore(right_hand_side.value, alloca);

        return Value_and_type
        {
            .value = alloca,
            .type = create_pointer_type_type_reference({ right_hand_side.type.value() }, expression.is_mutable)
        };
    }

    Value_and_type create_value(
        Module const& core_module,
        Variable_expression const& expression,
        llvm::Module& llvm_module,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables
    )
    {
        char const* const variable_name = expression.name.c_str();

        auto const is_variable = [variable_name](Value_and_type const& element) -> bool
        {
            return element.value->getName() == variable_name;
        };

        // Search in local variables:
        {
            auto const location = std::find_if(local_variables.rbegin(), local_variables.rend(), is_variable);
            if (location != local_variables.rend())
                return *location;
        }

        // Search in function arguments:
        {
            auto const location = std::find_if(function_arguments.begin(), function_arguments.end(), is_variable);
            if (location != function_arguments.end())
                return *location;
        }

        // Search for functions in this module:
        {
            llvm::Function* const llvm_function = llvm_module.getFunction(variable_name);
            if (llvm_function != nullptr)
            {
                std::optional<Function_declaration const*> const function_declaration = find_function_declaration(core_module, variable_name);

                return Value_and_type
                {
                    .value = llvm_function,
                    .type = std::nullopt // TODO create type
                };
            }
        }

        // TODO search for alias or enums

        // Search for module dependencies:
        {
            std::optional<std::string_view> const module_name = get_module_name_from_alias(core_module, variable_name);
            if (module_name.has_value())
            {
                return Value_and_type
                {
                    .value = nullptr,
                    .type = std::nullopt
                };
            }
        }

        throw std::runtime_error{ std::format("Undefined variable '{}'", variable_name) };
    }

    Value_and_type create_value(
        Module const& core_module,
        Statement const& statement,
        Expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables,
        std::span<Value_and_type const> const temporaries,
        std::span<Module_pair const> const module_dependencies,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        if (std::holds_alternative<Access_expression>(expression.data))
        {
            Access_expression const& data = std::get<Access_expression>(expression.data);
            return create_value(core_module, statement, data, temporaries, module_dependencies);
        }
        else if (std::holds_alternative<Assignment_expression>(expression.data))
        {
            Assignment_expression const& data = std::get<Assignment_expression>(expression.data);
            return create_value(data, llvm_context, llvm_data_layout, llvm_builder, temporaries, struct_types);
        }
        else if (std::holds_alternative<Binary_expression>(expression.data))
        {
            Binary_expression const& data = std::get<Binary_expression>(expression.data);
            return create_value(data, llvm_builder, temporaries);
        }
        else if (std::holds_alternative<Call_expression>(expression.data))
        {
            Call_expression const& data = std::get<Call_expression>(expression.data);
            return create_value(core_module, data, llvm_builder, temporaries, module_dependencies, temporaries_allocator);
        }
        else if (std::holds_alternative<Cast_expression>(expression.data))
        {
            Cast_expression const& data = std::get<Cast_expression>(expression.data);
            return create_value(core_module, data, llvm_context, llvm_data_layout, llvm_builder, temporaries, module_dependencies, struct_types);
        }
        else if (std::holds_alternative<Constant_expression>(expression.data))
        {
            Constant_expression const& data = std::get<Constant_expression>(expression.data);
            return create_value(data, llvm_context, llvm_data_layout, llvm_module, struct_types);
        }
        else if (std::holds_alternative<Return_expression>(expression.data))
        {
            Return_expression const& data = std::get<Return_expression>(expression.data);
            return create_value(data, llvm_builder, temporaries);
        }
        else if (std::holds_alternative<Variable_expression>(expression.data))
        {
            Variable_expression const& data = std::get<Variable_expression>(expression.data);
            return create_value(core_module, data, llvm_module, function_arguments, local_variables);
        }
        else if (std::holds_alternative<Variable_declaration_expression>(expression.data))
        {
            Variable_declaration_expression const& data = std::get<Variable_declaration_expression>(expression.data);
            return create_value(data, llvm_builder, temporaries);
        }
        else
        {
            //static_assert(always_false_v<Expression_type>, "non-exhaustive visitor!");
            throw std::runtime_error{ "Did not handle expression type!" };
        }
    }

    llvm::Function& create_function_declaration(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Function_declaration const& function_declaration,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::FunctionType* const llvm_function_type = to_function_type(
            llvm_context,
            llvm_data_layout,
            function_declaration.type.input_parameter_types,
            function_declaration.type.output_parameter_types,
            struct_types,
            temporaries_allocator
        );

        llvm::Function& llvm_function = to_function(
            *llvm_function_type,
            function_declaration
        );

        return llvm_function;
    }

    void create_function_definition(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::Function& llvm_function,
        Module const& core_module,
        Function_declaration const& function_declaration,
        Function_definition const& function_definition,
        std::span<Module_pair const> const module_dependencies,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const block = llvm::BasicBlock::Create(llvm_context, "entry", &llvm_function);

        llvm::IRBuilder<> llvm_builder{ block };

        {
            std::pmr::vector<Value_and_type> function_arguments{ temporaries_allocator };
            function_arguments.reserve(llvm_function.arg_size());

            for (std::size_t argument_index = 0; argument_index < function_declaration.type.input_parameter_types.size(); ++argument_index)
            {
                llvm::Argument* const llvm_argument = llvm_function.getArg(argument_index);
                Type_reference const& core_type = function_declaration.type.input_parameter_types[argument_index];

                function_arguments.push_back({ .value = llvm_argument, .type = core_type });
            }

            std::pmr::vector<Value_and_type> local_variables{ temporaries_allocator };
            local_variables.reserve(function_definition.statements.size());

            for (std::size_t statement_index = 0; statement_index < function_definition.statements.size(); ++statement_index)
            {
                Statement const& statement = function_definition.statements[statement_index];

                std::pmr::vector<Value_and_type> temporaries{ temporaries_allocator };
                temporaries.resize(statement.expressions.size());

                for (std::size_t index = 0; index < statement.expressions.size(); ++index)
                {
                    std::size_t const expression_index = statement.expressions.size() - 1 - index;
                    Expression const& expression = statement.expressions[expression_index];

                    Value_and_type const instruction = create_value(
                        core_module,
                        statement,
                        expression,
                        llvm_context,
                        llvm_data_layout,
                        llvm_module,
                        llvm_builder,
                        function_arguments,
                        local_variables,
                        temporaries,
                        module_dependencies,
                        struct_types,
                        temporaries_allocator
                    );

                    temporaries[expression_index] = instruction;
                }

                local_variables.push_back(temporaries.front());
            }
        }

        llvm::verifyFunction(llvm_function);
    }

    void add_module_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        std::span<Function_declaration const> const function_declarations,
        std::span<std::pmr::string const> const usages,
        bool const filter_by_usages,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        {
            auto& llvm_function_list = llvm_module.getFunctionList();

            for (Function_declaration const& function_declaration : function_declarations)
            {
                if (!filter_by_usages || std::find(usages.begin(), usages.end(), function_declaration.name) != usages.end())
                {
                    llvm::Function& llvm_function = create_function_declaration(
                        llvm_context,
                        llvm_data_layout,
                        function_declaration,
                        struct_types,
                        temporaries_allocator
                    );

                    llvm_function_list.push_back(&llvm_function);
                }
            }
        }
    }

    void add_module_definitions(
        Module const& core_module,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        std::span<Module_pair const> const module_dependencies,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (Function_definition const& definition : core_module.definitions.function_definitions)
        {
            Function_declaration const& declaration = *find_function_declaration(core_module, definition.name).value();

            llvm::Function* llvm_function = llvm_module.getFunction(definition.name.c_str());
            if (!llvm_function)
            {
                std::string_view const function_name = definition.name;
                std::string_view const module_name = llvm_module.getName();
                throw std::runtime_error{ std::format("Function '{}' not found in module '{}'.", function_name, module_name) };
            }

            create_function_definition(
                llvm_context,
                llvm_data_layout,
                llvm_module,
                *llvm_function,
                core_module,
                declaration,
                definition,
                module_dependencies,
                struct_types,
                temporaries_allocator
            );
        }
    }

    void generate_code(
        std::string_view const output_filename,
        llvm::Module& llvm_module
    )
    {
        // Initialize the target registry etc.
        llvm::InitializeAllTargetInfos();
        llvm::InitializeAllTargets();
        llvm::InitializeAllTargetMCs();
        llvm::InitializeAllAsmParsers();
        llvm::InitializeAllAsmPrinters();

        std::string const target_triple = llvm::sys::getDefaultTargetTriple();

        llvm::Target const& target = [&]() -> llvm::Target const&
        {
            std::string error;
            llvm::Target const* target = llvm::TargetRegistry::lookupTarget(target_triple, error);

            // Print an error and exit if we couldn't find the requested target.
            // This generally occurs if we've forgotten to initialise the
            // TargetRegistry or we have a bogus target triple.
            if (!target)
            {
                llvm::errs() << error;
                throw std::runtime_error{ error };
            }

            return *target;
        }();

        char const* const cpu = "generic";
        char const* const features = "";
        llvm::TargetOptions const target_options;
        llvm::Optional<llvm::Reloc::Model> const code_model;
        llvm::TargetMachine* target_machine = target.createTargetMachine(target_triple, cpu, features, target_options, code_model);

        llvm_module.setTargetTriple(target_triple);
        llvm_module.setDataLayout(target_machine->createDataLayout());

        {
            llvm::legacy::PassManager pass_manager;

            std::error_code error_code;
            llvm::raw_fd_ostream output_stream(output_filename, error_code, llvm::sys::fs::OF_None);

            if (error_code)
            {
                llvm::errs() << "Could not open file: " << error_code.message();
                throw std::runtime_error{ error_code.message() };
            }

            if (target_machine->addPassesToEmitFile(pass_manager, output_stream, nullptr, llvm::CGFT_ObjectFile))
            {
                llvm::errs() << "target_machine can't emit a file of this type";
                throw std::runtime_error{ error_code.message() };
            }

            pass_manager.run(llvm_module);
        }
    }

    std::unique_ptr<llvm::Module> create_dependency_module(
        llvm::LLVMContext& llvm_context,
        std::string_view const target_triple,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<std::pmr::string const> const usages,
        bool const filter_by_usages,
        Struct_types const& struct_types
    )
    {
        std::unique_ptr<llvm::Module> llvm_module = std::make_unique<llvm::Module>(core_module.name.c_str(), llvm_context);
        llvm_module->setTargetTriple(target_triple);
        llvm_module->setDataLayout(llvm_data_layout);

        add_module_declarations(llvm_context, llvm_data_layout, *llvm_module, core_module.export_declarations.function_declarations, usages, filter_by_usages, struct_types, {});
        add_module_declarations(llvm_context, llvm_data_layout, *llvm_module, core_module.internal_declarations.function_declarations, usages, filter_by_usages, struct_types, {});

        return llvm_module;
    }


    std::unique_ptr<llvm::Module> create_module(
        llvm::LLVMContext& llvm_context,
        std::string_view const target_triple,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Module_pair const> const module_dependencies,
        Struct_types const& struct_types
    )
    {
        std::unique_ptr<llvm::Module> llvm_module = create_dependency_module(llvm_context, target_triple, llvm_data_layout, core_module, {}, false, struct_types);

        add_module_definitions(core_module, llvm_context, llvm_data_layout, *llvm_module, module_dependencies, struct_types, {});

        return llvm_module;
    }

    std::pmr::vector<Module_pair> create_dependency_modules(
        llvm::LLVMContext& llvm_context,
        std::string_view const target_triple,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        Struct_types const& struct_types,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        std::pmr::vector<Module_pair> modules;
        modules.reserve(core_module.dependencies.alias_imports.size());

        for (Import_module_with_alias const& alias_import : core_module.dependencies.alias_imports)
        {
            auto const location = module_name_to_file_path_map.find(alias_import.module_name);
            if (location == module_name_to_file_path_map.end())
            {
                throw std::runtime_error{ std::format("Could not find corresponding file of module '{}'", alias_import.module_name) };
            }

            std::filesystem::path const& file_path = location->second;

            if (!std::filesystem::exists(file_path))
            {
                throw std::runtime_error{ std::format("Module '{}' file '{}' does not exist!", alias_import.module_name, file_path.generic_string()) };
            }

            std::optional<Module> import_core_module = h::json::read_module_export_declarations(file_path);
            if (!import_core_module.has_value())
            {
                throw std::runtime_error{ std::format("Failed to read Module '{}' file '{}' as JSON.", alias_import.module_name, file_path.generic_string()) };
            }

            std::unique_ptr<llvm::Module> llvm_module = create_dependency_module(llvm_context, target_triple, llvm_data_layout, import_core_module.value(), alias_import.usages, true, struct_types);

            Module_pair pair
            {
                .core_module = std::move(import_core_module.value()),
                .llvm_module = std::move(llvm_module)
            };

            modules.push_back(std::move(pair));
        }

        return modules;
    }

    LLVM_data initialize_llvm()
    {
        // Initialize the target registry:
        llvm::InitializeAllTargetInfos();
        llvm::InitializeAllTargets();
        llvm::InitializeAllTargetMCs();
        llvm::InitializeAllAsmParsers();
        llvm::InitializeAllAsmPrinters();

        std::string target_triple = llvm::sys::getDefaultTargetTriple();

        llvm::Target const& target = [&]() -> llvm::Target const&
        {
            std::string error;
            llvm::Target const* target = llvm::TargetRegistry::lookupTarget(target_triple, error);

            // Print an error and exit if we couldn't find the requested target.
            // This generally occurs if we've forgotten to initialise the
            // TargetRegistry or we have a bogus target triple.
            if (!target)
            {
                llvm::errs() << error;
                throw std::runtime_error{ error };
            }

            return *target;
        }();

        char const* const cpu = "generic";
        char const* const features = "";
        llvm::TargetOptions const target_options;
        llvm::Optional<llvm::Reloc::Model> const code_model;
        llvm::TargetMachine* target_machine = target.createTargetMachine(target_triple, cpu, features, target_options, code_model);
        llvm::DataLayout llvm_data_layout = target_machine->createDataLayout();

        std::unique_ptr<llvm::LLVMContext> llvm_context = std::make_unique<llvm::LLVMContext>();
        Struct_types struct_types = create_struct_types(*llvm_context);

        return LLVM_data
        {
            .target_triple = std::move(target_triple),
            .target = &target,
            .target_machine = target_machine,
            .data_layout = std::move(llvm_data_layout),
            .context = std::move(llvm_context),
            .struct_types = std::move(struct_types),
        };
    }

    LLVM_module_data create_llvm_module(
        LLVM_data& llvm_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        std::pmr::vector<Module_pair> module_dependencies = create_dependency_modules(*llvm_data.context, llvm_data.target_triple, llvm_data.data_layout, core_module, llvm_data.struct_types, module_name_to_file_path_map);
        std::unique_ptr<llvm::Module> llvm_module = create_module(*llvm_data.context, llvm_data.target_triple, llvm_data.data_layout, core_module, module_dependencies, llvm_data.struct_types);

        return {
            .dependencies = std::move(module_dependencies),
            .module = std::move(llvm_module)
        };
    }

    std::string to_string(
        llvm::Module const& llvm_module
    )
    {
        std::string output;
        llvm::raw_string_ostream stream{ output };
        llvm_module.print(stream, nullptr);
        return output;
    }

    void write_to_file(
        LLVM_data const& llvm_data,
        LLVM_module_data const& llvm_module_data,
        std::filesystem::path const& output_file_path
    )
    {
        llvm::legacy::PassManager pass_manager;

        std::error_code error_code;
        llvm::raw_fd_ostream output_stream(output_file_path.generic_string(), error_code, llvm::sys::fs::OF_None);

        if (error_code)
        {
            std::string const error_message = error_code.message();
            llvm::errs() << "Could not open file: " << error_message;
            throw std::runtime_error{ error_message };
        }

        if (llvm_data.target_machine->addPassesToEmitFile(pass_manager, output_stream, nullptr, llvm::CGFT_ObjectFile))
        {
            std::string const error_message = error_code.message();
            llvm::errs() << "Target machine can't emit a file of this type: " << error_message;
            throw std::runtime_error{ error_message };
        }

        pass_manager.run(*llvm_module_data.module);
    }

    void generate_object_file(
        std::filesystem::path const& output_file_path,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        LLVM_data llvm_data = initialize_llvm();
        LLVM_module_data llvm_module_data = create_llvm_module(llvm_data, core_module, module_name_to_file_path_map);

        llvm_module_data.module->print(llvm::errs(), nullptr);

        write_to_file(llvm_data, llvm_module_data, output_file_path);
    }
}