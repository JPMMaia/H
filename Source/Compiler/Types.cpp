module;

#include <llvm/IR/DataLayout.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Type.h>
#include <llvm/IR/Value.h>

#include <functional>
#include <memory_resource>
#include <span>
#include <string>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

module h.compiler.types;

import h.core;

namespace h::compiler
{
    Type_reference create_bool_type_reference()
    {
        return create_fundamental_type_type_reference(Fundamental_type::Bool);
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


    Type_reference create_custom_type_reference(std::string_view const module_name, std::string_view const name)
    {
        return Type_reference
        {
            .data = Custom_type_reference
            {
                .module_reference =
                {
                    .name = std::pmr::string{ module_name },
                },
                .name = std::pmr::string{ name }
            }
        };
    }

    bool is_custom_type_reference(Type_reference const& type)
    {
        return std::holds_alternative<Custom_type_reference>(type.data);
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


    Type_reference create_fundamental_type_type_reference(Fundamental_type const value)
    {
        return Type_reference
        {
            .data = value
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

    bool is_floating_point(Type_reference const& type)
    {
        if (std::holds_alternative<Fundamental_type>(type.data))
        {
            Fundamental_type const data = std::get<Fundamental_type>(type.data);
            return (data == Fundamental_type::Float16) || (data == Fundamental_type::Float32) || (data == Fundamental_type::Float64);
        }

        return false;
    }


    Type_reference create_integer_type_type_reference(std::uint32_t const number_of_bits, bool const is_signed)
    {
        return Type_reference
        {
            .data = Integer_type
            {
                .number_of_bits = number_of_bits,
                .is_signed = is_signed
            }
        };
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


    bool is_enum_type(Type_reference const& type, llvm::Value* const value)
    {
        return is_custom_type_reference(type) && value->getType()->isIntegerTy();
    }


    Builtin_types create_builtin_types(llvm::LLVMContext& llvm_context)
    {
        llvm::Type* int8_pointer_type = llvm::Type::getInt8PtrTy(llvm_context);
        llvm::Type* int64_type = llvm::Type::getInt64Ty(llvm_context);

        llvm::StructType* string_type = llvm::StructType::create({ int8_pointer_type, int64_type }, "__hl_string");

        return Builtin_types
        {
            .string = string_type,
        };
    }

    template <typename Function_t>
    void visit_type_references(
        Type_reference const& type_reference,
        Function_t predicate
    )
    {
        predicate(type_reference);

        if (std::holds_alternative<Constant_array_type>(type_reference.data))
        {
            Constant_array_type const& data = std::get<Constant_array_type>(type_reference.data);
            for (Type_reference const& nested_type_reference : data.value_type)
                visit_type_references(nested_type_reference, predicate);
        }
        else if (std::holds_alternative<Function_type>(type_reference.data))
        {
            Function_type const& data = std::get<Function_type>(type_reference.data);
            for (Type_reference const& nested_type_reference : data.input_parameter_types)
                visit_type_references(nested_type_reference, predicate);
            for (Type_reference const& nested_type_reference : data.output_parameter_types)
                visit_type_references(nested_type_reference, predicate);
        }
        else if (std::holds_alternative<Pointer_type>(type_reference.data))
        {
            Pointer_type const& data = std::get<Pointer_type>(type_reference.data);
            for (Type_reference const& nested_type_reference : data.element_type)
                visit_type_references(nested_type_reference, predicate);
        }
    }

    std::pmr::vector<Alias_type_declaration const*> find_nested_alias_types(
        Type_reference const& type_reference,
        std::span<Alias_type_declaration const> const external_alias_type_declarations,
        std::span<Alias_type_declaration const> const internal_alias_type_declarations
    )
    {
        std::pmr::vector<Alias_type_declaration const*> nested_alias;

        auto const find_alias_type_declaration = [&](Custom_type_reference const& custom_type_reference) -> Alias_type_declaration const*
        {
            {
                auto const location = std::find_if(
                    external_alias_type_declarations.begin(),
                    external_alias_type_declarations.end(),
                    [&](Alias_type_declaration const& declaration) { return declaration.name == custom_type_reference.name; }
                );

                if (location != external_alias_type_declarations.end())
                    return &(*location);
            }

            {
                auto const location = std::find_if(
                    internal_alias_type_declarations.begin(),
                    internal_alias_type_declarations.end(),
                    [&](Alias_type_declaration const& declaration) { return declaration.name == custom_type_reference.name; }
                );

                if (location != internal_alias_type_declarations.end())
                    return &(*location);
            }

            return nullptr;
        };

        auto const add_nested_alias = [&](Type_reference const& type_reference) -> void
        {
            if (std::holds_alternative<Custom_type_reference>(type_reference.data))
            {
                Custom_type_reference const custom_type_reference = std::get<Custom_type_reference>(type_reference.data);
                if (custom_type_reference.module_reference.name.empty())
                {
                    Alias_type_declaration const* const declaration = find_alias_type_declaration(custom_type_reference);
                    if (declaration != nullptr)
                    {
                        nested_alias.push_back(declaration);
                    }
                }
            }
        };

        visit_type_references(type_reference, add_nested_alias);

        return nested_alias;
    }

    void add_alias_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Alias_type_declaration const& alias_type_declaration,
        Module const& core_module,
        Type_database const& type_database,
        LLVM_type_map& llvm_type_map
    )
    {
        {
            auto const location = llvm_type_map.find(alias_type_declaration.name);
            if (location != llvm_type_map.end())
                return;
        }

        if (!alias_type_declaration.type.empty())
        {
            std::pmr::vector<Alias_type_declaration const*> const nested_alias_types = find_nested_alias_types(alias_type_declaration.type[0], core_module.export_declarations.alias_type_declarations, core_module.internal_declarations.alias_type_declarations);
            for (Alias_type_declaration const* nested_alias_type : nested_alias_types)
            {
                add_alias_type(llvm_context, llvm_data_layout, *nested_alias_type, core_module, type_database, llvm_type_map);
            }
        }

        llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module.name, alias_type_declaration.type, type_database);
        llvm_type_map.insert(std::make_pair(alias_type_declaration.name, llvm_type));
    }

    void add_alias_types(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::span<Alias_type_declaration const> const alias_type_declarations,
        Module const& core_module,
        Type_database const& type_database,
        LLVM_type_map& llvm_type_map
    )
    {
        for (Alias_type_declaration const& alias_type_declaration : alias_type_declarations)
        {
            add_alias_type(llvm_context, llvm_data_layout, alias_type_declaration, core_module, type_database, llvm_type_map);
        }
    }

    void add_enum_types(
        llvm::LLVMContext& llvm_context,
        std::span<Enum_declaration const> const enum_declarations,
        LLVM_type_map& llvm_type_map
    )
    {
        for (Enum_declaration const& enum_declaration : enum_declarations)
        {
            // TODO figure out required number of bits
            unsigned const number_of_bits = 32;
            llvm::Type* const integer_type = llvm::Type::getIntNTy(llvm_context, number_of_bits);
            llvm_type_map.insert(std::make_pair(enum_declaration.name, integer_type));
        }
    }

    void add_struct_declarations(
        llvm::LLVMContext& llvm_context,
        std::span<Struct_declaration const> const struct_declarations,
        LLVM_type_map& llvm_type_map
    )
    {
        for (Struct_declaration const& struct_declaration : struct_declarations)
        {
            llvm::StructType* const value = llvm::StructType::create(llvm_context, struct_declaration.name.c_str());
            llvm_type_map.insert(std::make_pair(struct_declaration.name, value));
        }
    }

    void set_struct_definitions(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        std::span<Struct_declaration const> const struct_declarations,
        Type_database const& type_database,
        LLVM_type_map const& llvm_type_map
    )
    {
        for (Struct_declaration const& struct_declaration : struct_declarations)
        {
            std::pmr::vector<llvm::Type*> const llvm_types = type_references_to_llvm_types(
                llvm_context,
                llvm_data_layout,
                current_module_name,
                struct_declaration.member_types,
                type_database,
                {}
            );

            llvm::Type* const llvm_type = llvm_type_map.at(struct_declaration.name);
            if (llvm::StructType::classof(llvm_type))
            {
                llvm::StructType* const llvm_struct_type = static_cast<llvm::StructType*>(llvm_type);
                llvm_struct_type->setBody(llvm_types);
            }
        }
    }

    Type_database create_type_database(
        llvm::LLVMContext& llvm_context
    )
    {
        return
        {
            .builtin = create_builtin_types(llvm_context),
            .name_to_llvm_type = {}
        };
    }

    void add_module_types(
        Type_database& type_database,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module
    )
    {
        LLVM_type_map& llvm_type_map = type_database.name_to_llvm_type[core_module.name];

        add_enum_types(llvm_context, core_module.export_declarations.enum_declarations, llvm_type_map);
        add_enum_types(llvm_context, core_module.internal_declarations.enum_declarations, llvm_type_map);

        add_struct_declarations(llvm_context, core_module.export_declarations.struct_declarations, llvm_type_map);
        add_struct_declarations(llvm_context, core_module.internal_declarations.struct_declarations, llvm_type_map);

        add_alias_types(llvm_context, llvm_data_layout, core_module.export_declarations.alias_type_declarations, core_module, type_database, llvm_type_map);
        add_alias_types(llvm_context, llvm_data_layout, core_module.internal_declarations.alias_type_declarations, core_module, type_database, llvm_type_map);

        set_struct_definitions(llvm_context, llvm_data_layout, core_module.name, core_module.export_declarations.struct_declarations, type_database, llvm_type_map);
        set_struct_definitions(llvm_context, llvm_data_layout, core_module.name, core_module.internal_declarations.struct_declarations, type_database, llvm_type_map);
    }

    llvm::Type* fundamental_type_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Fundamental_type const type,
        Builtin_types const& builtin_types
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
            return builtin_types.string;
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

    llvm::Type* integer_type_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        Integer_type const type
    )
    {
        return llvm::Type::getIntNTy(llvm_context, type.number_of_bits);
    }

    llvm::Type* pointer_type_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        Pointer_type const type,
        Type_database const& type_database
    )
    {
        llvm::Type* pointed_type = !type.element_type.empty() ? type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, type.element_type[0], type_database) : llvm::Type::getVoidTy(llvm_context);
        return pointed_type->getPointerTo();
    }

    llvm::Type* type_reference_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        Type_reference const& type_reference,
        Type_database const& type_database
    )
    {
        if (std::holds_alternative<Builtin_type_reference>(type_reference.data))
        {
            Builtin_type_reference const& data = std::get<Builtin_type_reference>(type_reference.data);
            throw std::runtime_error{ "Not implemented." };
        }
        else if (std::holds_alternative<Constant_array_type>(type_reference.data))
        {
            Constant_array_type const& data = std::get<Constant_array_type>(type_reference.data);
            throw std::runtime_error{ "Not implemented." };
        }
        else if (std::holds_alternative<Custom_type_reference>(type_reference.data))
        {
            Custom_type_reference const& data = std::get<Custom_type_reference>(type_reference.data);
            std::string_view const module_name = data.module_reference.name.empty() ? current_module_name : std::string_view{ data.module_reference.name };
            LLVM_type_map const& llvm_type_map = type_database.name_to_llvm_type.at(module_name.data());
            llvm::Type* const llvm_type = llvm_type_map.at(data.name);
            return llvm_type;
        }
        else if (std::holds_alternative<Fundamental_type>(type_reference.data))
        {
            Fundamental_type const data = std::get<Fundamental_type>(type_reference.data);
            return fundamental_type_to_llvm_type(llvm_context, llvm_data_layout, data, type_database.builtin);
        }
        else if (std::holds_alternative<Function_type>(type_reference.data))
        {
            Function_type const& data = std::get<Function_type>(type_reference.data);
            throw std::runtime_error{ "Not implemented." };
        }
        else if (std::holds_alternative<Integer_type>(type_reference.data))
        {
            Integer_type const& data = std::get<Integer_type>(type_reference.data);
            return integer_type_to_llvm_type(llvm_context, data);
        }
        else if (std::holds_alternative<Pointer_type>(type_reference.data))
        {
            Pointer_type const& data = std::get<Pointer_type>(type_reference.data);
            return pointer_type_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, data, type_database);
        }

        throw std::runtime_error{ "Not implemented." };
    }

    llvm::Type* type_reference_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        std::span<Type_reference const> const type_reference,
        Type_database const& type_database
    )
    {
        if (type_reference.empty())
            return llvm::Type::getVoidTy(llvm_context);

        return type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, type_reference[0], type_database);
    }

    std::pmr::vector<llvm::Type*> type_references_to_llvm_types(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        std::string_view const current_module_name,
        std::span<Type_reference const> const type_references,
        Type_database const& type_database,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<llvm::Type*> output{ output_allocator };
        output.resize(type_references.size());

        std::transform(
            type_references.begin(),
            type_references.end(),
            output.begin(),
            [&](Type_reference const& type_reference) -> llvm::Type* { return type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module_name, type_reference, type_database); }
        );

        return output;
    }
}
