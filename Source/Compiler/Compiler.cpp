module;

#include <llvm/IR/IRBuilder.h>
#include "llvm/IR/LegacyPassManager.h"
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/PassManager.h>
#include <llvm/IR/Verifier.h>
#include <llvm/MC/TargetRegistry.h>
#include <llvm/Passes/PassBuilder.h>
#include "llvm/Passes/StandardInstrumentations.h"
#include <llvm/Support/FileSystem.h>
#include <llvm/Support/Host.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Target/TargetMachine.h>
#include <llvm/Target/TargetOptions.h>
#include "llvm/Transforms/InstCombine/InstCombine.h"
#include "llvm/Transforms/Scalar.h"
#include "llvm/Transforms/Scalar/GVN.h"
#include "llvm/Transforms/Scalar/Reassociate.h"
#include "llvm/Transforms/Scalar/SimplifyCFG.h"

#include <bit>
#include <cassert>
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
    std::string_view to_string_view(llvm::StringRef const string)
    {
        return std::string_view{ string.data(), string.size() };
    }

    std::optional<Module const*> get_module(std::span<Module const> const core_modules, std::string_view const name)
    {
        auto const location = std::find_if(core_modules.begin(), core_modules.end(), [name](Module const& module) { return module.name == name; });
        if (location == core_modules.end())
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

    enum class Mangle_name_strategy
    {
        Only_declaration_name,
        Module_and_declaration_name
    };

    std::string mangle_name(
        std::string_view const module_name,
        std::string_view const declaration_name,
        Mangle_name_strategy const strategy
    )
    {
        switch (strategy)
        {
        case Mangle_name_strategy::Only_declaration_name:
            return std::string{ declaration_name.begin(), declaration_name.end() };
        case Mangle_name_strategy::Module_and_declaration_name:
        default:
            return std::format("{}_{}", module_name, declaration_name);
        }
    }

    std::string mangle_name(
        Module const& core_module,
        std::string_view const declaration_name
    )
    {
        // TODO decide which strategy to use per module?
        Mangle_name_strategy const mangle_strategy = Mangle_name_strategy::Only_declaration_name;
        std::string mangled_name = mangle_name(core_module.name, declaration_name, mangle_strategy);
        return mangled_name;
    }

    llvm::Function* get_llvm_function(
        Module const& core_module,
        llvm::Module& llvm_module,
        std::string_view const name
    )
    {
        std::string const mangled_name = mangle_name(core_module, name);
        llvm::Function* const llvm_function = llvm_module.getFunction(mangled_name);
        return llvm_function;
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

    Type_reference create_function_type_type_reference(Function_type const& function_type)
    {
        return Type_reference
        {
            .data = function_type
        };
    }

    std::optional<Type_reference> get_function_output_type_reference(Type_reference const& type)
    {
        if (std::holds_alternative<Function_type>(type.data))
        {
            Function_type const& function_type = std::get<Function_type>(type.data);

            if (function_type.output_parameter_types.empty())
                return std::nullopt;

            if (function_type.output_parameter_types.size() == 1)
                return function_type.output_parameter_types.front();

            // TODO function with multiple output arguments
        }

        throw std::runtime_error{ "Type is not a function type!" };
    }

    bool is_pointer(Type_reference const& type)
    {
        return std::holds_alternative<Pointer_type>(type.data);
    }

    bool is_non_void_pointer(Type_reference const& type)
    {
        if (std::holds_alternative<Pointer_type>(type.data))
        {
            Pointer_type const& pointer_type = std::get<Pointer_type>(type.data);
            return !pointer_type.element_type.empty();
        }

        return false;
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

    Type_reference create_fundamental_type_type_reference(Fundamental_type const value)
    {
        return Type_reference
        {
            .data = value
        };
    }

    Type_reference create_bool_type_reference()
    {
        return create_fundamental_type_type_reference(Fundamental_type::Bool);
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
        bool const is_var_arg,
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

        return llvm::FunctionType::get(llvm_return_type, llvm_input_parameter_types, is_var_arg);
    }

    llvm::Function& to_function(
        Module const& core_module,
        llvm::FunctionType& llvm_function_type,
        Function_declaration const& function_declaration
    )
    {
        llvm::GlobalValue::LinkageTypes const linkage = to_linkage(function_declaration.linkage);

        std::string const mangled_name = mangle_name(core_module, function_declaration.name);

        llvm::Function* const llvm_function = llvm::Function::Create(
            &llvm_function_type,
            linkage,
            mangled_name.c_str(),
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

    bool ends_with_terminator_statement(std::span<Statement const> const statements)
    {
        if (statements.empty())
            return false;

        Statement const& last_statement = statements.back();

        if (last_statement.expressions.empty())
            return false;

        Expression const& first_expression = last_statement.expressions[0];
        return std::holds_alternative<Break_expression>(first_expression.data) || std::holds_alternative<Continue_expression>(first_expression.data) || std::holds_alternative<Return_expression>(first_expression.data);
    }

    enum class Block_type
    {
        For_loop,
        Switch,
        While_loop
    };

    struct Block_info
    {
        Block_type block_type = {};
        llvm::BasicBlock* repeat_block = nullptr;
        llvm::BasicBlock* after_block = nullptr;
    };

    struct Value_and_type
    {
        std::pmr::string name;
        llvm::Value* value;
        std::optional<Type_reference> type;
    };

    std::optional<Value_and_type> search_in_function_scope(
        std::string_view const variable_name,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables
    )
    {
        auto const is_variable = [variable_name](Value_and_type const& element) -> bool
        {
            return element.name == variable_name;
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

        return {};
    }

    Value_and_type create_value(
        Module const& core_module,
        Statement const& statement,
        Expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const blocks,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> temporaries,
        std::span<Module const> core_module_dependencies,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    Value_and_type create_value(
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        Statement const& statement,
        Access_expression const& expression,
        llvm::Module& llvm_module,
        std::span<Value_and_type const> const temporaries
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

                std::optional<std::string_view> const external_module_name = get_module_name_from_alias(core_module, module_alias_name);
                if (!external_module_name.has_value())
                    throw std::runtime_error{ std::format("Undefined variable '{}'", module_alias_name) };

                Module const& external_module = *get_module(core_module_dependencies, external_module_name.value()).value();
                std::string const mangled_name = mangle_name(external_module, expression.member_name);

                // TODO try to find alias/enum/struct:
                llvm::Function* const llvm_function = llvm_module.getFunction(mangled_name);
                if (!llvm_function)
                    throw std::runtime_error{ std::format("Unknown function '{}.{}' referenced. Mangled name is '{}'.", external_module_name.value(), expression.member_name, mangled_name) };

                std::optional<Function_declaration const*> function_declaration = find_function_declaration(external_module, expression.member_name.c_str());
                Type_reference function_type = create_function_type_type_reference(function_declaration.value()->type);

                return Value_and_type
                {
                    .name = std::pmr::string{ mangled_name.begin(), mangled_name.end()},
                    .value = llvm_function,
                    .type = std::move(function_type)
                };
            }
        }

        // TODO enum / struct access
        return Value_and_type
        {
            .name = "",
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

    Value_and_type create_assignment_operation_instruction(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        Value_and_type const& left_hand_side,
        Value_and_type const& right_hand_side,
        std::optional<Binary_operation> const additional_operation,
        Struct_types const& struct_types
    )
    {
        if (additional_operation.has_value())
        {
            Binary_operation const operation = additional_operation.value();

            Type_reference const left_hand_side_type = left_hand_side.type.value();
            llvm::Type* llvm_element_type = to_type(llvm_context, llvm_data_layout, left_hand_side_type, struct_types);
            llvm::Value* const loaded_value_value = llvm_builder.CreateLoad(llvm_element_type, left_hand_side.value);

            Value_and_type const loaded_value
            {
                .name = "",
                .value = loaded_value_value,
                .type = left_hand_side_type
            };

            Value_and_type const result = create_binary_operation_instruction(llvm_builder, loaded_value, right_hand_side, operation);

            llvm::Value* store_instruction = llvm_builder.CreateStore(result.value, left_hand_side.value);

            return
            {
                .name = "",
                .value = store_instruction,
                .type = std::nullopt
            };
        }
        else
        {
            llvm::Value* store_instruction = llvm_builder.CreateStore(right_hand_side.value, left_hand_side.value);

            return
            {
                .name = "",
                .value = store_instruction,
                .type = std::nullopt
            };
        }
    }

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

        return create_assignment_operation_instruction(llvm_context, llvm_data_layout, llvm_builder, left_hand_side, right_hand_side, expression.additional_operation, struct_types);
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
                    .name = "",
                    .value = llvm_builder.CreateAdd(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
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
                    .name = "",
                    .value = llvm_builder.CreateSub(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
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
                    .name = "",
                    .value = llvm_builder.CreateMul(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
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
                        .name = "",
                        .value = llvm_builder.CreateSDiv(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateUDiv(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
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
                        .name = "",
                        .value = llvm_builder.CreateSRem(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateURem(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFRem(left_hand_side.value, right_hand_side.value),
                    .type = type
                };
            }
            break;
        }
        case Binary_operation::Equal: {
            if (is_bool(type) || is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateICmpEQ(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOEQ(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Not_equal: {
            if (is_bool(type) || is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateICmpNE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpONE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
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
                        .name = "",
                        .value = llvm_builder.CreateICmpSLT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpULT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOLT(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
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
                        .name = "",
                        .value = llvm_builder.CreateICmpSLE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpULE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOLE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
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
                        .name = "",
                        .value = llvm_builder.CreateICmpSGT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpUGT(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOGT(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
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
                        .name = "",
                        .value = llvm_builder.CreateICmpSGE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
                        .value = llvm_builder.CreateICmpUGE(left_hand_side.value, right_hand_side.value),
                        .type = create_bool_type_reference()
                    };
                }
            }
            else if (is_floating_point(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateFCmpOGE(left_hand_side.value, right_hand_side.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Binary_operation::Logical_and: {
            return Value_and_type
            {
                .name = "",
                .value = llvm_builder.CreateAnd(left_hand_side.value, right_hand_side.value),
                .type = create_bool_type_reference()
            };
        }
        case Binary_operation::Logical_or: {
            return Value_and_type
            {
                .name = "",
                .value = llvm_builder.CreateOr(left_hand_side.value, right_hand_side.value),
                .type = create_bool_type_reference()
            };
        }
        case Binary_operation::Bitwise_and: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
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
                    .name = "",
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
                    .name = "",
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
                    .name = "",
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
                        .name = "",
                        .value = llvm_builder.CreateAShr(left_hand_side.value, right_hand_side.value),
                        .type = type
                    };
                }
                else
                {
                    return Value_and_type
                    {
                        .name = "",
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

    Value_and_type create_statement_value(
        Statement const& statement,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const blocks,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<Value_and_type> temporaries;
        temporaries.resize(statement.expressions.size());

        for (std::size_t index = 0; index < statement.expressions.size(); ++index)
        {
            std::size_t const expression_index = statement.expressions.size() - 1 - index;
            Expression const& current_expression = statement.expressions[expression_index];

            Value_and_type const instruction = create_value(
                core_module,
                statement,
                current_expression,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                blocks,
                function_arguments,
                local_variables,
                temporaries,
                core_module_dependencies,
                struct_types,
                temporaries_allocator
            );

            temporaries[expression_index] = instruction;
        }

        return temporaries.front();
    }

    void create_statement_values(
        std::span<Statement const> const statements,
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const blocks,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<Value_and_type> all_local_variables;
        all_local_variables.reserve(local_variables.size() + statements.size());
        all_local_variables.insert(all_local_variables.begin(), local_variables.begin(), local_variables.end());

        for (Statement const statement : statements)
        {
            Value_and_type statement_value = create_statement_value(
                statement,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                blocks,
                function_arguments,
                all_local_variables,
                struct_types,
                temporaries_allocator
            );

            all_local_variables.push_back(statement_value);
        }
    }

    Value_and_type create_value(
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        Block_expression const& block_expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const blocks,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::span<Statement const> statements = block_expression.statements;

        create_statement_values(
            statements,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            blocks,
            function_arguments,
            local_variables,
            struct_types,
            temporaries_allocator
        );

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Break_expression const& break_expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Block_info const> const blocks
    )
    {
        auto const find_target_block = [&]() -> llvm::BasicBlock*
        {
            std::uint64_t target_break_count = break_expression.loop_count <= 1 ? 1 : break_expression.loop_count;
            std::uint64_t found_break_blocks = 0;

            for (std::size_t index = 0; index < blocks.size(); ++index)
            {
                std::size_t const block_index = blocks.size() - index - 1;
                Block_info const& block_info = blocks[block_index];

                if (block_info.block_type == Block_type::For_loop || block_info.block_type == Block_type::Switch || block_info.block_type == Block_type::While_loop)
                {
                    found_break_blocks += 1;

                    if (found_break_blocks == target_break_count)
                    {
                        return block_info.after_block;
                    }
                }
            }

            throw std::runtime_error{ std::format("Could not find block to break!") };
        };

        llvm::BasicBlock* const target_block = find_target_block();
        llvm_builder.CreateBr(target_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Module const& core_module,
        Call_expression const& expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Value_and_type const& left_hand_side = temporaries[expression.expression.expression_index];

        if (!llvm::Function::classof(left_hand_side.value))
            throw std::runtime_error{ std::format("Left hand side of call expression is not a function!") };

        llvm::Function* const llvm_function = static_cast<llvm::Function*>(left_hand_side.value);

        if (expression.arguments.size() != llvm_function->arg_size() && !llvm_function->isVarArg())
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

        std::optional<Type_reference> function_output_type_reference = get_function_output_type_reference(left_hand_side.type.value());

        return
        {
            .name = "",
            .value = call_instruction,
            .type = std::move(function_output_type_reference)
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
            .name = "",
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
                    .name = "",
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
                    .name = "",
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
                    .name = "",
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
                    .name = "",
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
                .name = "",
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
                .name = "",
                .value = instruction,
                .type = expression.type
            };
        }

        throw std::runtime_error{ "Constant expression not handled!" };
    }

    Value_and_type create_value(
        Continue_expression const& continue_expression,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Block_info const> const block_infos
    )
    {
        auto const find_target_block = [&]() -> llvm::BasicBlock*
        {
            for (std::size_t index = 0; index < block_infos.size(); ++index)
            {
                std::size_t const block_index = block_infos.size() - index - 1;
                Block_info const& block_info = block_infos[block_index];

                if (block_info.block_type == Block_type::For_loop || block_info.block_type == Block_type::While_loop)
                {
                    return block_info.repeat_block;
                }
            }

            throw std::runtime_error{ std::format("Could not find loop block to continue!") };
        };

        llvm::BasicBlock* const target_block = find_target_block();
        llvm_builder.CreateBr(target_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    std::pmr::vector<Statement> skip_block(Statement const& statement)
    {
        if (statement.expressions.empty())
            return {};

        Expression const& first_expression = statement.expressions[0];
        if (std::holds_alternative<Block_expression>(first_expression.data))
        {
            Block_expression const& block_expression = std::get<Block_expression>(first_expression.data);
            return block_expression.statements;
        }

        return { {statement} };
    }

    Value_and_type create_value(
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        For_loop_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Value_and_type const& range_begin_temporary = temporaries[expression.range_begin.expression_index];

        // Loop variable declaration:
        Type_reference const& variable_type = range_begin_temporary.type.value();
        llvm::Type* const variable_llvm_type = to_type(llvm_context, llvm_data_layout, variable_type, struct_types);
        llvm::Value* const variable_alloca = llvm_builder.CreateAlloca(variable_llvm_type, nullptr, expression.variable_name.c_str());
        llvm_builder.CreateStore(range_begin_temporary.value, variable_alloca);
        Value_and_type const variable_value = { .name = expression.variable_name, .value = variable_alloca, .type = variable_type };

        llvm::BasicBlock* const condition_block = llvm::BasicBlock::Create(llvm_context, "for_loop_condition", llvm_parent_function);
        llvm::BasicBlock* const then_block = llvm::BasicBlock::Create(llvm_context, "for_loop_then", llvm_parent_function);
        llvm::BasicBlock* const update_index_block = llvm::BasicBlock::Create(llvm_context, "for_loop_update_index", llvm_parent_function);
        llvm::BasicBlock* const after_block = llvm::BasicBlock::Create(llvm_context, "for_loop_after", llvm_parent_function);

        llvm_builder.CreateBr(condition_block);

        // Loop condition:
        {
            llvm_builder.SetInsertPoint(condition_block);

            Value_and_type const& range_end_value = create_statement_value(
                expression.range_end,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                block_infos,
                function_arguments,
                local_variables,
                struct_types,
                temporaries_allocator
            );

            Value_and_type const loaded_variable_value
            {
                .name = expression.variable_name,
                .value = llvm_builder.CreateLoad(variable_llvm_type, variable_alloca),
                .type = variable_type,
            };

            Binary_operation const compare_operation = expression.range_comparison_operation;
            Value_and_type const condition_value = create_binary_operation_instruction(llvm_builder, loaded_variable_value, range_end_value, compare_operation);

            llvm_builder.CreateCondBr(condition_value.value, then_block, after_block);
        }

        // Loop body:
        {
            llvm_builder.SetInsertPoint(then_block);

            std::pmr::vector<Value_and_type> all_local_variables{ local_variables.begin(), local_variables.end() };
            all_local_variables.push_back(variable_value);

            std::pmr::vector<Block_info> all_block_infos{ block_infos.begin(), block_infos.end() };
            all_block_infos.push_back(Block_info{ .block_type = Block_type::For_loop, .repeat_block = update_index_block, .after_block = after_block });

            std::pmr::vector<Statement> const then_statements = skip_block(expression.then_statement);
            create_statement_values(
                then_statements,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                all_block_infos,
                function_arguments,
                all_local_variables,
                struct_types,
                temporaries_allocator
            );

            if (!ends_with_terminator_statement(then_statements))
                llvm_builder.CreateBr(update_index_block);
        }

        // Update loop variable:
        {
            llvm_builder.SetInsertPoint(update_index_block);

            Constant_expression const default_step_constant
            {
                .type = variable_type,
                .data =
                    (expression.range_comparison_operation == Binary_operation::Less_than) || (expression.range_comparison_operation == Binary_operation::Less_than_or_equal_to) ?
                    "1" :
                    "-1"
            };

            Value_and_type const step_by_value =
                expression.step_by.has_value() ?
                temporaries[expression.step_by.value().expression_index] :
                create_value(default_step_constant, llvm_context, llvm_data_layout, llvm_module, struct_types);

            create_assignment_operation_instruction(
                llvm_context,
                llvm_data_layout,
                llvm_builder,
                variable_value,
                step_by_value,
                Binary_operation::Add,
                struct_types
            );

            llvm_builder.CreateBr(condition_block);
        }

        // After the loop:
        llvm_builder.SetInsertPoint(after_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        If_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto const calculate_number_of_blocks = [](std::span<Condition_statement_pair const> const series) -> std::uint32_t
        {
            if (series.size() == 1)
                return 2;

            Condition_statement_pair const& last_serie = series.back();
            bool const is_else_if = last_serie.condition.has_value();

            std::uint32_t const blocks_except_last = 2 * (series.size() - 1);
            std::uint32_t const last = is_else_if ? 2 : 1;
            std::uint32_t const total = blocks_except_last + last;
            return total;
        };

        auto get_block_name = [](std::size_t const index, std::size_t const last_index) -> std::string
        {
            if (index == 0)
                return std::format("if_s{}_then", index);
            else if (index == last_index)
                return std::format("if_s{}_after", index);
            else if (index % 2 != 0)
                return std::format("if_s{}_else", index);
            else
                return std::format("if_s{}_then", index);
        };

        std::uint32_t const number_of_blocks = calculate_number_of_blocks(expression.series);

        std::pmr::vector<llvm::BasicBlock*> blocks;
        blocks.resize(number_of_blocks);

        for (std::size_t index = 0; index < blocks.size(); ++index)
        {
            std::string const block_name = get_block_name(index, blocks.size() - 1);
            blocks[index] = llvm::BasicBlock::Create(llvm_context, block_name, llvm_parent_function);
        }

        llvm::BasicBlock* const end_if_block = blocks.back();

        for (std::size_t serie_index = 0; serie_index < expression.series.size(); ++serie_index)
        {
            Condition_statement_pair const& serie = expression.series[serie_index];

            // if: current, then, end_if
            // if,else_if: current, then, else, then, end_if
            // if,else: current, then, else, end_if
            // if,else_if,else: current, then, else, then, else, end_if

            if (serie.condition.has_value())
            {
                Value_and_type const& condition_value = create_statement_value(
                    serie.condition.value(),
                    core_module,
                    core_module_dependencies,
                    llvm_context,
                    llvm_data_layout,
                    llvm_module,
                    llvm_builder,
                    llvm_parent_function,
                    block_infos,
                    function_arguments,
                    local_variables,
                    struct_types,
                    temporaries_allocator
                );

                std::size_t const block_index = 2 * serie_index;
                llvm::BasicBlock* const then_block = blocks[block_index];
                llvm::BasicBlock* const else_block = blocks[block_index + 1];

                llvm_builder.CreateCondBr(condition_value.value, then_block, else_block);

                llvm_builder.SetInsertPoint(then_block);
                std::pmr::vector<Statement> const statements = skip_block(serie.statement);
                create_statement_values(
                    statements,
                    core_module,
                    core_module_dependencies,
                    llvm_context,
                    llvm_data_layout,
                    llvm_module,
                    llvm_builder,
                    llvm_parent_function,
                    block_infos,
                    function_arguments,
                    local_variables,
                    struct_types,
                    temporaries_allocator
                );

                if (!ends_with_terminator_statement(statements))
                    llvm_builder.CreateBr(end_if_block);

                llvm_builder.SetInsertPoint(else_block);
            }
            else
            {
                std::pmr::vector<Statement> const statements = skip_block(serie.statement);
                create_statement_values(
                    statements,
                    core_module,
                    core_module_dependencies,
                    llvm_context,
                    llvm_data_layout,
                    llvm_module,
                    llvm_builder,
                    llvm_parent_function,
                    block_infos,
                    function_arguments,
                    local_variables,
                    struct_types,
                    temporaries_allocator
                );

                if (!ends_with_terminator_statement(statements))
                    llvm_builder.CreateBr(end_if_block);

                llvm_builder.SetInsertPoint(end_if_block);
            }
        }

        return Value_and_type
        {
            .name = "",
            .value = end_if_block,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Parenthesis_expression const& expression,
        std::span<Value_and_type const> const temporaries
    )
    {
        Value_and_type temporary = temporaries[expression.expression.expression_index];
        return temporary;
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
            .name = "",
            .value = instruction,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        Switch_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<llvm::BasicBlock*> case_blocks;
        case_blocks.resize(expression.cases.size());

        llvm::BasicBlock* const after_block = llvm::BasicBlock::Create(llvm_context, "switch_after", llvm_parent_function);
        llvm::BasicBlock* default_case_block = nullptr;

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];

            std::string const block_name = switch_case.case_value.has_value() ? std::format("switch_case_i{}_", case_index) : "switch_case_default";

            llvm::BasicBlock* case_block = llvm::BasicBlock::Create(llvm_context, block_name, llvm_parent_function);

            if (!switch_case.case_value.has_value())
                default_case_block = case_block;

            case_blocks[case_index] = case_block;
        }

        if (default_case_block == nullptr)
            default_case_block = after_block;

        std::uint64_t const number_of_cases = static_cast<std::uint64_t>(expression.cases.size());

        Value_and_type const& switch_value = temporaries[expression.value.expression_index];

        llvm::SwitchInst* switch_instruction = llvm_builder.CreateSwitch(switch_value.value, default_case_block, number_of_cases);

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];

            if (switch_case.case_value.has_value())
            {
                llvm::BasicBlock* const case_block = case_blocks[case_index];
                Value_and_type const& case_value = temporaries[switch_case.case_value.value().expression_index];

                if (!llvm::ConstantInt::classof(case_value.value))
                    throw std::runtime_error("Swith case value is not a ConstantInt!");

                llvm::ConstantInt* const case_value_constant = static_cast<llvm::ConstantInt*>(case_value.value);

                switch_instruction->addCase(case_value_constant, case_block);
            }
        }

        std::pmr::vector<Block_info> all_block_infos{ block_infos.begin(), block_infos.end() };
        all_block_infos.push_back({ .block_type = Block_type::Switch, .repeat_block = nullptr, .after_block = after_block });

        for (std::size_t case_index = 0; case_index < expression.cases.size(); ++case_index)
        {
            Switch_case_expression_pair const& switch_case = expression.cases[case_index];
            llvm::BasicBlock* const case_block = case_blocks[case_index];

            llvm_builder.SetInsertPoint(case_block);

            create_statement_values(
                switch_case.statements,
                core_module,
                core_module_dependencies,
                llvm_context,
                llvm_data_layout,
                llvm_module,
                llvm_builder,
                llvm_parent_function,
                all_block_infos,
                function_arguments,
                local_variables,
                struct_types,
                temporaries_allocator
            );

            if (!ends_with_terminator_statement(switch_case.statements))
            {
                // If there is a next case:
                if ((case_index + 1) < expression.cases.size())
                {
                    llvm::BasicBlock* const next_case_block = case_blocks[case_index + 1];
                    llvm_builder.CreateBr(next_case_block);
                }
                else
                {
                    llvm_builder.CreateBr(after_block);
                }
            }
        }

        llvm_builder.SetInsertPoint(after_block);

        return Value_and_type
        {
            .name = "",
            .value = nullptr,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        Ternary_condition_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const then_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_then", llvm_parent_function);
        llvm::BasicBlock* const else_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_else", llvm_parent_function);
        llvm::BasicBlock* const end_block = llvm::BasicBlock::Create(llvm_context, "ternary_condition_end", llvm_parent_function);

        // Condition:
        Value_and_type const& condition_value = temporaries[expression.condition.expression_index];
        llvm_builder.CreateCondBr(condition_value.value, then_block, else_block);

        // Then:
        llvm_builder.SetInsertPoint(then_block);
        Value_and_type const& then_value = create_statement_value(
            expression.then_statement,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            block_infos,
            function_arguments,
            local_variables,
            struct_types,
            temporaries_allocator
        );
        llvm_builder.CreateBr(end_block);
        llvm::BasicBlock* const then_end_block = llvm_builder.GetInsertBlock();

        // Else:
        llvm_builder.SetInsertPoint(else_block);
        Value_and_type const& else_value = create_statement_value(
            expression.else_statement,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            block_infos,
            function_arguments,
            local_variables,
            struct_types,
            temporaries_allocator
        );
        llvm_builder.CreateBr(end_block);
        llvm::BasicBlock* const else_end_block = llvm_builder.GetInsertBlock();

        if (then_value.type.has_value() && else_value.type.has_value() && then_value.type.value() != else_value.type.value())
            throw std::runtime_error{ "Ternary condition then and else statements must have the same type!" };

        // End:
        llvm_builder.SetInsertPoint(end_block);
        llvm::PHINode* const phi_node = llvm_builder.CreatePHI(then_value.value->getType(), 2);
        phi_node->addIncoming(then_value.value, then_end_block);
        phi_node->addIncoming(else_value.value, else_end_block);

        return Value_and_type
        {
            .name = "",
            .value = phi_node,
            .type = then_value.type
        };
    }

    Value_and_type create_value(
        Unary_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const local_variables,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types
    )
    {
        Value_and_type const& value_expression = temporaries[expression.expression.expression_index];
        Unary_operation const operation = expression.operation;

        Type_reference const& type = value_expression.type.value();

        switch (operation)
        {
        case Unary_operation::Not: {
            if (is_bool(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNot(value_expression.value),
                    .type = create_bool_type_reference()
                };
            }
            break;
        }
        case Unary_operation::Bitwise_not: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNot(value_expression.value),
                    .type = type
                };
            }
            break;
        }
        case Unary_operation::Minus: {
            if (is_integer(type))
            {
                return Value_and_type
                {
                    .name = "",
                    .value = llvm_builder.CreateNeg(value_expression.value),
                    .type = type
                };
            }
            break;
        }
        case Unary_operation::Pre_decrement:
        case Unary_operation::Pre_increment:
        case Unary_operation::Post_decrement:
        case Unary_operation::Post_increment: {
            if (is_integer(type))
            {
                llvm::Type* llvm_value_type = to_type(llvm_context, llvm_data_layout, type, struct_types);

                bool const is_increment = (operation == Unary_operation::Pre_increment) || (operation == Unary_operation::Post_increment);
                bool const is_post = (operation == Unary_operation::Post_decrement) || (operation == Unary_operation::Post_increment);

                llvm::Value* const current_value = llvm_builder.CreateLoad(llvm_value_type, value_expression.value);

                llvm::Value* const new_value = is_increment ?
                    llvm_builder.CreateAdd(current_value, llvm::ConstantInt::get(current_value->getType(), 1)) :
                    llvm_builder.CreateSub(current_value, llvm::ConstantInt::get(current_value->getType(), 1));

                llvm_builder.CreateStore(new_value, value_expression.value);

                llvm::Value* const returned_value = is_post ? current_value : new_value;

                return Value_and_type
                {
                    .name = "",
                    .value = returned_value,
                    .type = type
                };
            }
            break;
        }
        case Unary_operation::Indirection: {
            if (is_non_void_pointer(type))
            {
                Type_reference const core_pointee_type = remove_pointer(type).value();
                llvm::Type* const llvm_pointee_type = to_type(llvm_context, llvm_data_layout, core_pointee_type, struct_types);

                llvm::Value* const load_address = llvm_builder.CreateLoad(value_expression.value->getType(), value_expression.value);
                llvm::Value* const load_value = llvm_builder.CreateLoad(llvm_pointee_type, load_address);

                return Value_and_type
                {
                    .name = "",
                    .value = load_value,
                    .type = core_pointee_type
                };
            }
            break;
        }
        case Unary_operation::Address_of: {
            std::string_view const variable_name = value_expression.name;

            std::optional<Value_and_type> location = search_in_function_scope(variable_name, {}, local_variables);
            if (location.has_value())
            {
                Value_and_type const& variable_declaration = location.value();
                return Value_and_type
                {
                    .name = "",
                    .value = variable_declaration.value,
                    .type = create_pointer_type_type_reference({ variable_declaration.type.value() }, false)
                };
            }
        }
        }

        throw std::runtime_error{ std::format("Unary operation '{}' not implemented!", static_cast<std::uint32_t>(operation)) };
    }

    Value_and_type create_value(
        Variable_declaration_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types
    )
    {
        Value_and_type const& right_hand_side = temporaries[expression.right_hand_side.expression_index];

        llvm::Value* const alloca = llvm_builder.CreateAlloca(right_hand_side.value->getType(), nullptr, expression.name.c_str());

        llvm_builder.CreateStore(right_hand_side.value, alloca);

        return Value_and_type
        {
            .name = expression.name,
            .value = alloca,
            .type = right_hand_side.type
        };
    }

    Value_and_type create_value(
        Module const& core_module,
        Variable_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables,
        Struct_types const& struct_types
    )
    {
        char const* const variable_name = expression.name.c_str();

        auto const is_variable = [variable_name](Value_and_type const& element) -> bool
        {
            return element.name == variable_name;
        };

        // Search in local variables:
        {
            auto const location = std::find_if(local_variables.rbegin(), local_variables.rend(), is_variable);
            if (location != local_variables.rend())
            {
                if (expression.access_type == Access_type::Read)
                {
                    Type_reference const& type = location->type.value();
                    llvm::Type* const llvm_pointee_type = to_type(llvm_context, llvm_data_layout, type, struct_types);
                    llvm::Value* const loaded_value = llvm_builder.CreateLoad(llvm_pointee_type, location->value);

                    return Value_and_type
                    {
                        .name = expression.name,
                        .value = loaded_value,
                        .type = type
                    };
                }
                else
                {
                    return *location;
                }
            }
        }

        // Search in function arguments:
        {
            auto const location = std::find_if(function_arguments.begin(), function_arguments.end(), is_variable);
            if (location != function_arguments.end())
                return *location;
        }

        // Search for functions in this module:
        {
            llvm::Function* const llvm_function = get_llvm_function(core_module, llvm_module, variable_name);
            if (llvm_function != nullptr)
            {
                std::optional<Function_declaration const*> const function_declaration = find_function_declaration(core_module, variable_name);

                Type_reference type = create_function_type_type_reference(function_declaration.value()->type);

                return Value_and_type
                {
                    .name = expression.name,
                    .value = llvm_function,
                    .type = std::move(type)
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
                    .name = expression.name,
                    .value = nullptr,
                    .type = std::nullopt
                };
            }
        }

        throw std::runtime_error{ std::format("Undefined variable '{}'", variable_name) };
    }

    Value_and_type create_value(
        Module const& core_module,
        std::span<Module const> core_module_dependencies,
        While_loop_expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> function_arguments,
        std::span<Value_and_type const> local_variables,
        std::span<Value_and_type const> const temporaries,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const condition_block = llvm::BasicBlock::Create(llvm_context, "while_loop_condition", llvm_parent_function);
        llvm::BasicBlock* const then_block = llvm::BasicBlock::Create(llvm_context, "while_loop_then", llvm_parent_function);
        llvm::BasicBlock* const after_block = llvm::BasicBlock::Create(llvm_context, "while_loop_after", llvm_parent_function);

        std::pmr::vector<Block_info> all_block_infos{ block_infos.begin(), block_infos.end() };
        all_block_infos.push_back(
            Block_info
            {
                .block_type = Block_type::While_loop,
                .repeat_block = condition_block,
                .after_block = after_block,
            }
        );

        llvm_builder.CreateBr(condition_block);
        llvm_builder.SetInsertPoint(condition_block);
        Value_and_type const& condition_value = create_statement_value(
            expression.condition,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            block_infos,
            function_arguments,
            local_variables,
            struct_types,
            temporaries_allocator
        );
        llvm_builder.CreateCondBr(condition_value.value, then_block, after_block);

        llvm_builder.SetInsertPoint(then_block);
        std::pmr::vector<Statement> const then_block_statements = skip_block(expression.then_statement);
        create_statement_values(
            then_block_statements,
            core_module,
            core_module_dependencies,
            llvm_context,
            llvm_data_layout,
            llvm_module,
            llvm_builder,
            llvm_parent_function,
            all_block_infos,
            function_arguments,
            local_variables,
            struct_types,
            temporaries_allocator
        );
        if (!ends_with_terminator_statement(then_block_statements))
            llvm_builder.CreateBr(condition_block);

        llvm_builder.SetInsertPoint(after_block);

        return Value_and_type
        {
            .name = "",
            .value = after_block,
            .type = std::nullopt
        };
    }

    Value_and_type create_value(
        Module const& core_module,
        Statement const& statement,
        Expression const& expression,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Function* const llvm_parent_function,
        std::span<Block_info const> const block_infos,
        std::span<Value_and_type const> const function_arguments,
        std::span<Value_and_type const> const local_variables,
        std::span<Value_and_type const> const temporaries,
        std::span<Module const> const core_module_dependencies,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        if (std::holds_alternative<Access_expression>(expression.data))
        {
            Access_expression const& data = std::get<Access_expression>(expression.data);
            return create_value(core_module, core_module_dependencies, statement, data, llvm_module, temporaries);
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
        else if (std::holds_alternative<Block_expression>(expression.data))
        {
            Block_expression const& data = std::get<Block_expression>(expression.data);
            return create_value(core_module, core_module_dependencies, data, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, struct_types, temporaries_allocator);
        }
        else if (std::holds_alternative<Break_expression>(expression.data))
        {
            Break_expression const& data = std::get<Break_expression>(expression.data);
            return create_value(data, llvm_builder, block_infos);
        }
        else if (std::holds_alternative<Call_expression>(expression.data))
        {
            Call_expression const& data = std::get<Call_expression>(expression.data);
            return create_value(core_module, data, llvm_builder, temporaries, temporaries_allocator);
        }
        else if (std::holds_alternative<Cast_expression>(expression.data))
        {
            Cast_expression const& data = std::get<Cast_expression>(expression.data);
            return create_value(core_module, data, llvm_context, llvm_data_layout, llvm_builder, temporaries, struct_types);
        }
        else if (std::holds_alternative<Constant_expression>(expression.data))
        {
            Constant_expression const& data = std::get<Constant_expression>(expression.data);
            return create_value(data, llvm_context, llvm_data_layout, llvm_module, struct_types);
        }
        else if (std::holds_alternative<Continue_expression>(expression.data))
        {
            Continue_expression const& data = std::get<Continue_expression>(expression.data);
            return create_value(data, llvm_builder, block_infos);
        }
        else if (std::holds_alternative<For_loop_expression>(expression.data))
        {
            For_loop_expression const& data = std::get<For_loop_expression>(expression.data);
            return create_value(core_module, core_module_dependencies, data, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, struct_types, temporaries_allocator);
        }
        else if (std::holds_alternative<If_expression>(expression.data))
        {
            If_expression const& data = std::get<If_expression>(expression.data);
            return create_value(core_module, core_module_dependencies, data, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, struct_types, temporaries_allocator);
        }
        else if (std::holds_alternative<Parenthesis_expression>(expression.data))
        {
            Parenthesis_expression const& data = std::get<Parenthesis_expression>(expression.data);
            return create_value(data, temporaries);
        }
        else if (std::holds_alternative<Return_expression>(expression.data))
        {
            Return_expression const& data = std::get<Return_expression>(expression.data);
            return create_value(data, llvm_builder, temporaries);
        }
        else if (std::holds_alternative<Ternary_condition_expression>(expression.data))
        {
            Ternary_condition_expression const& data = std::get<Ternary_condition_expression>(expression.data);
            return create_value(core_module, core_module_dependencies, data, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, struct_types, temporaries_allocator);
        }
        else if (std::holds_alternative<Switch_expression>(expression.data))
        {
            Switch_expression const& data = std::get<Switch_expression>(expression.data);
            return create_value(core_module, core_module_dependencies, data, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, struct_types, temporaries_allocator);
        }
        else if (std::holds_alternative<Unary_expression>(expression.data))
        {
            Unary_expression const& data = std::get<Unary_expression>(expression.data);
            return create_value(data, llvm_context, llvm_data_layout, llvm_builder, local_variables, temporaries, struct_types);
        }
        else if (std::holds_alternative<Variable_expression>(expression.data))
        {
            Variable_expression const& data = std::get<Variable_expression>(expression.data);
            return create_value(core_module, data, llvm_context, llvm_data_layout, llvm_module, llvm_builder, function_arguments, local_variables, struct_types);
        }
        else if (std::holds_alternative<Variable_declaration_expression>(expression.data))
        {
            Variable_declaration_expression const& data = std::get<Variable_declaration_expression>(expression.data);
            return create_value(data, llvm_context, llvm_data_layout, llvm_builder, temporaries, struct_types);
        }
        else if (std::holds_alternative<While_loop_expression>(expression.data))
        {
            While_loop_expression const& data = std::get<While_loop_expression>(expression.data);
            return create_value(core_module, core_module_dependencies, data, llvm_context, llvm_data_layout, llvm_module, llvm_builder, llvm_parent_function, block_infos, function_arguments, local_variables, temporaries, struct_types, temporaries_allocator);
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
        Module const& core_module,
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
            function_declaration.type.is_variadic,
            struct_types,
            temporaries_allocator
        );

        llvm::Function& llvm_function = to_function(
            core_module,
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
        std::span<Module const> const core_module_dependencies,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        llvm::BasicBlock* const block = llvm::BasicBlock::Create(llvm_context, "entry", &llvm_function);

        llvm::IRBuilder<> llvm_builder{ block };

        std::pmr::vector<Block_info> block_infos;

        {
            std::pmr::vector<Value_and_type> function_arguments{ temporaries_allocator };
            function_arguments.reserve(llvm_function.arg_size());

            for (std::size_t argument_index = 0; argument_index < function_declaration.type.input_parameter_types.size(); ++argument_index)
            {
                llvm::Argument* const llvm_argument = llvm_function.getArg(argument_index);
                std::pmr::string const& name = function_declaration.input_parameter_names[argument_index];
                Type_reference const& core_type = function_declaration.type.input_parameter_types[argument_index];

                function_arguments.push_back({ .name = name, .value = llvm_argument, .type = core_type });
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
                        &llvm_function,
                        block_infos,
                        function_arguments,
                        local_variables,
                        temporaries,
                        core_module_dependencies,
                        struct_types,
                        temporaries_allocator
                    );

                    temporaries[expression_index] = instruction;
                }

                local_variables.push_back(temporaries.front());
            }
        }

        auto const return_void_is_missing = [&]() -> bool
        {
            if (!function_definition.statements.empty())
            {
                Statement const& statement = function_definition.statements.back();
                if (!statement.expressions.empty())
                {
                    Expression const& expression = statement.expressions[0];
                    if (std::holds_alternative<Return_expression>(expression.data))
                        return false;
                }
            }

            return true;
        };

        if (return_void_is_missing())
        {
            llvm_builder.CreateRetVoid();
        }

        if (llvm::verifyFunction(llvm_function, &llvm::errs())) {
            llvm_function.dump();
            throw std::runtime_error{ std::format("Function '{}' from module '{}' is not valid!", function_declaration.name, core_module.name) };
        }
    }

    void add_module_definitions(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (Function_definition const& definition : core_module.definitions.function_definitions)
        {
            Function_declaration const& declaration = *find_function_declaration(core_module, definition.name).value();

            llvm::Function* llvm_function = get_llvm_function(core_module, llvm_module, definition.name);
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
                core_module_dependencies,
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
        std::optional<llvm::Reloc::Model> const code_model;
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

    std::pmr::vector<Module> create_dependency_core_modules(
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        std::pmr::vector<Module> modules;
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

            modules.push_back(std::move(import_core_module.value()));
        }

        return modules;
    }

    void add_dependency_module_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Struct_types const& struct_types,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        auto& llvm_function_list = llvm_module.getFunctionList();

        for (std::size_t alias_import_index = 0; alias_import_index < core_module.dependencies.alias_imports.size(); ++alias_import_index)
        {
            Import_module_with_alias const& alias_import = core_module.dependencies.alias_imports[alias_import_index];
            Module const& core_module_dependency = core_module_dependencies[alias_import_index];

            // TODO alias, enums and structs

            for (Function_declaration const& function_declaration : core_module_dependency.export_declarations.function_declarations)
            {
                auto const location = std::find_if(alias_import.usages.begin(), alias_import.usages.end(), [&](std::pmr::string const& usage) -> bool { return function_declaration.name == usage; });
                if (location != alias_import.usages.end())
                {
                    llvm::Function& llvm_function = create_function_declaration(
                        llvm_context,
                        llvm_data_layout,
                        core_module,
                        function_declaration,
                        struct_types,
                        temporaries_allocator
                    );

                    llvm_function_list.push_back(&llvm_function);
                }
            }
        }
    }

    void add_module_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Module& llvm_module,
        Module const& core_module,
        std::span<Function_declaration const> const function_declarations,
        Struct_types const& struct_types,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        {
            auto& llvm_function_list = llvm_module.getFunctionList();

            for (Function_declaration const& function_declaration : function_declarations)
            {
                llvm::Function& llvm_function = create_function_declaration(
                    llvm_context,
                    llvm_data_layout,
                    core_module,
                    function_declaration,
                    struct_types,
                    temporaries_allocator
                );

                llvm_function_list.push_back(&llvm_function);
            }
        }
    }

    std::unique_ptr<llvm::Module> create_module(
        llvm::LLVMContext& llvm_context,
        std::string_view const target_triple,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        Struct_types const& struct_types
    )
    {
        std::unique_ptr<llvm::Module> llvm_module = std::make_unique<llvm::Module>(core_module.name.c_str(), llvm_context);
        llvm_module->setTargetTriple(target_triple);
        llvm_module->setDataLayout(llvm_data_layout);

        add_module_declarations(llvm_context, llvm_data_layout, *llvm_module, core_module, core_module.export_declarations.function_declarations, struct_types, {});
        add_module_declarations(llvm_context, llvm_data_layout, *llvm_module, core_module, core_module.internal_declarations.function_declarations, struct_types, {});

        add_dependency_module_declarations(llvm_context, llvm_data_layout, *llvm_module, struct_types, core_module, core_module_dependencies, {});
        add_module_definitions(llvm_context, llvm_data_layout, *llvm_module, core_module, core_module_dependencies, struct_types, {});

        if (llvm::verifyModule(*llvm_module, &llvm::errs()))
        {
            llvm_module->dump();
            throw std::runtime_error{ std::format("Module '{}' is not valid!", core_module.name) };
        }

        return llvm_module;
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
        std::optional<llvm::Reloc::Model> const code_model;
        llvm::TargetMachine* target_machine = target.createTargetMachine(target_triple, cpu, features, target_options, code_model);
        llvm::DataLayout llvm_data_layout = target_machine->createDataLayout();

        std::unique_ptr<llvm::LLVMContext> llvm_context = std::make_unique<llvm::LLVMContext>();
        Struct_types struct_types = create_struct_types(*llvm_context);

        std::unique_ptr<llvm::LoopAnalysisManager> loop_analysis_manager = std::make_unique<llvm::LoopAnalysisManager>();
        std::unique_ptr<llvm::FunctionAnalysisManager> function_analysis_manager = std::make_unique<llvm::FunctionAnalysisManager>();
        std::unique_ptr<llvm::CGSCCAnalysisManager> cgscc_analysis_manager = std::make_unique<llvm::CGSCCAnalysisManager>();
        std::unique_ptr<llvm::ModuleAnalysisManager> module_analysis_manager = std::make_unique<llvm::ModuleAnalysisManager>();

        llvm::PassBuilder pass_builder;
        pass_builder.registerModuleAnalyses(*module_analysis_manager);
        pass_builder.registerCGSCCAnalyses(*cgscc_analysis_manager);
        pass_builder.registerFunctionAnalyses(*function_analysis_manager);
        pass_builder.registerLoopAnalyses(*loop_analysis_manager);
        pass_builder.crossRegisterProxies(
            *loop_analysis_manager,
            *function_analysis_manager,
            *cgscc_analysis_manager,
            *module_analysis_manager
        );

        llvm::ModulePassManager module_pass_manager = pass_builder.buildPerModuleDefaultPipeline(llvm::OptimizationLevel::O2);

        return LLVM_data
        {
            .target_triple = std::move(target_triple),
            .target = &target,
            .target_machine = target_machine,
            .data_layout = std::move(llvm_data_layout),
            .context = std::move(llvm_context),
            .struct_types = std::move(struct_types),
            .optimization_managers =
            {
                .loop_analysis_manager = std::move(loop_analysis_manager),
                .function_analysis_manager = std::move(function_analysis_manager),
                .cgscc_analysis_manager = std::move(cgscc_analysis_manager),
                .module_analysis_manager = std::move(module_analysis_manager),
                .module_pass_manager = std::move(module_pass_manager),
            }
        };
    }

    LLVM_module_data create_llvm_module(
        LLVM_data& llvm_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    )
    {
        std::pmr::vector<Module> core_module_dependencies = create_dependency_core_modules(core_module, module_name_to_file_path_map);
        std::unique_ptr<llvm::Module> llvm_module = create_module(*llvm_data.context, llvm_data.target_triple, llvm_data.data_layout, core_module, core_module_dependencies, llvm_data.struct_types);

        return {
            .dependencies = std::move(core_module_dependencies),
            .module = std::move(llvm_module)
        };
    }

    void optimize_llvm_module(
        LLVM_data& llvm_data,
        llvm::Module& llvm_module
    )
    {
        llvm_data.optimization_managers.module_pass_manager.run(llvm_module, *llvm_data.optimization_managers.module_analysis_manager);
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