module;

#include <llvm/IR/DataLayout.h>
#include <llvm/IR/DebugInfoMetadata.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/DIBuilder.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Type.h>
#include <llvm/IR/Value.h>

#include <array>
#include <filesystem>
#include <functional>
#include <memory_resource>
#include <span>
#include <string>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

module h.compiler.types;

import h.common;
import h.compiler.clang_code_generation;
import h.compiler.clang_data;
import h.compiler.common;
import h.core;
import h.core.types;

namespace h::compiler
{
    bool is_enum_type(Type_reference const& type, llvm::Value* const value)
    {
        return is_custom_type_reference(type) && value->getType()->isIntegerTy();
    }

    Builtin_types create_builtin_types(llvm::LLVMContext& llvm_context)
    {
        llvm::Type* int8_pointer_type = llvm::PointerType::get(llvm::Type::getInt8Ty(llvm_context), 0);
        llvm::Type* int64_type = llvm::Type::getInt64Ty(llvm_context);

        llvm::StructType* string_type = llvm::StructType::create({ int8_pointer_type, int64_type }, "__hl_string");

        return Builtin_types
        {
            .string = string_type,
        };
    }

    Debug_builtin_types create_debug_builtin_types(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_scope,
        llvm::DataLayout const& llvm_data_layout
    )
    {
        unsigned const pointer_size_in_bits = llvm_data_layout.getPointerSizeInBits();

        llvm::DIType* const byte_type = llvm_debug_builder.createBasicType("Byte", 8, llvm::dwarf::DW_ATE_unsigned_char);
        llvm::DIType* const byte_pointer_type = llvm_debug_builder.createPointerType(byte_type, pointer_size_in_bits);
        llvm::DIType* const uint64_type = llvm_debug_builder.createBasicType("Uint64", 64, llvm::dwarf::DW_ATE_unsigned);

        std::array<llvm::Metadata*, 2> const elements
        {
            llvm_debug_builder.createMemberType(
                &llvm_scope,
                "data",
                nullptr,
                0,
                pointer_size_in_bits,
                8,
                0,
                llvm::DINode::FlagZero,
                byte_pointer_type
            ),
            llvm_debug_builder.createMemberType(
                &llvm_scope,
                "length",
                nullptr,
                0,
                64,
                8,
                pointer_size_in_bits,
                llvm::DINode::FlagZero,
                uint64_type
            ),
        };

        unsigned const size_in_bits = pointer_size_in_bits + 64;

        llvm::DIType* string_type = llvm_debug_builder.createStructType(
            &llvm_scope,
            "String",
            nullptr,
            0,
            size_in_bits,
            8,
            llvm::DINode::FlagZero,
            nullptr,
            llvm_debug_builder.getOrCreateArray(elements)
        );

        return Debug_builtin_types
        {
            .string = string_type,
        };
    }

    llvm::DIFile* get_or_create_llvm_debug_file(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        std::optional<Source_location> const& source_location
    )
    {
        if (!source_location.has_value() || !source_location->file_path.has_value())
            return &llvm_debug_file;

        auto const location = llvm_debug_files.find(*source_location->file_path);
        if (location != llvm_debug_files.end())
            return location->second;
        
        llvm::DIFile* const new_llvm_debug_file = llvm_debug_builder.createFile(source_location->file_path->filename().generic_string(), source_location->file_path->parent_path().generic_string());
        llvm_debug_files.emplace(*source_location->file_path, new_llvm_debug_file);

        return new_llvm_debug_file;
    }

    std::pmr::vector<Alias_type_declaration const*> find_nested_alias_types(
        Module const& core_module,
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

        auto const add_nested_alias = [&](Type_reference const& type_reference) -> bool
        {
            if (std::holds_alternative<Custom_type_reference>(type_reference.data))
            {
                Custom_type_reference const& custom_type_reference = std::get<Custom_type_reference>(type_reference.data);
                std::string_view const type_module_name = find_module_name(core_module, custom_type_reference.module_reference);
                if (type_module_name == core_module.name)
                {
                    Alias_type_declaration const* const declaration = find_alias_type_declaration(custom_type_reference);
                    if (declaration != nullptr)
                    {
                        nested_alias.push_back(declaration);
                    }
                }
            }

            return false;
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
            std::pmr::vector<Alias_type_declaration const*> const nested_alias_types = find_nested_alias_types(core_module, alias_type_declaration.type[0], core_module.export_declarations.alias_type_declarations, core_module.internal_declarations.alias_type_declarations);
            for (Alias_type_declaration const* nested_alias_type : nested_alias_types)
            {
                add_alias_type(llvm_context, llvm_data_layout, *nested_alias_type, core_module, type_database, llvm_type_map);
            }
        }

        llvm::Type* const llvm_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, alias_type_declaration.type, type_database);
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

    void add_alias_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        llvm::DataLayout const& llvm_data_layout,
        Alias_type_declaration const& alias_type_declaration,
        Module const& core_module,
        Type_database const& type_database,
        Debug_type_database const& debug_type_database,
        LLVM_debug_type_map& llvm_debug_type_map
    )
    {
        {
            auto const location = llvm_debug_type_map.find(alias_type_declaration.name);
            if (location != llvm_debug_type_map.end())
                return;
        }

        if (!alias_type_declaration.type.empty())
        {
            std::pmr::vector<Alias_type_declaration const*> const nested_alias_types = find_nested_alias_types(core_module, alias_type_declaration.type[0], core_module.export_declarations.alias_type_declarations, core_module.internal_declarations.alias_type_declarations);
            for (Alias_type_declaration const* nested_alias_type : nested_alias_types)
            {
                add_alias_debug_type(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, *nested_alias_type, core_module, type_database, debug_type_database, llvm_debug_type_map);
            }
        }

        llvm::DIType* const llvm_original_debug_type = type_reference_to_llvm_debug_type(llvm_debug_builder, llvm_data_layout, core_module, alias_type_declaration.type, debug_type_database);

        llvm::DIFile* const declaration_llvm_debug_file = get_or_create_llvm_debug_file(llvm_debug_builder, llvm_debug_file, llvm_debug_files, alias_type_declaration.source_location);

        llvm::DIType* const llvm_alias_debug_type = llvm_debug_builder.createTypedef(
            llvm_original_debug_type,
            alias_type_declaration.name.c_str(),
            declaration_llvm_debug_file,
            alias_type_declaration.source_location.has_value() ? alias_type_declaration.source_location->line : 0,
            &llvm_debug_scope
        );

        llvm_debug_type_map.insert(std::make_pair(alias_type_declaration.name, llvm_alias_debug_type));
    }

    void add_alias_debug_types(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        llvm::DataLayout const& llvm_data_layout,
        std::span<Alias_type_declaration const> const alias_type_declarations,
        Module const& core_module,
        Type_database const& type_database,
        Debug_type_database const& debug_type_database,
        LLVM_debug_type_map& llvm_debug_type_map
    )
    {
        for (Alias_type_declaration const& alias_type_declaration : alias_type_declarations)
        {
            add_alias_debug_type(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, alias_type_declaration, core_module, type_database, debug_type_database, llvm_debug_type_map);
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

    void add_enum_debug_types(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        std::span<Enum_declaration const> const enum_declarations,
        std::pmr::unordered_map<std::pmr::string, std::pmr::vector<llvm::Constant*>> const& enum_value_constants,
        LLVM_debug_type_map& llvm_debug_type_map
    )
    {
        for (Enum_declaration const& enum_declaration : enum_declarations)
        {
            // TODO figure out required number of bits
            unsigned const number_of_bits = 32;
            llvm::DIType* const underlying_type = llvm_debug_builder.createBasicType("Int32", 32, llvm::dwarf::DW_ATE_signed);

            std::pmr::vector<llvm::Constant*> const& constants = enum_value_constants.at(enum_declaration.name);

            std::pmr::vector<llvm::Metadata*> elements;
            elements.reserve(enum_declaration.values.size());

            for (std::size_t index = 0; index < enum_declaration.values.size(); ++index)
            {
                Enum_value const& enum_value = enum_declaration.values[index];
                llvm::Constant* const enum_constant = constants[index];
                llvm::ConstantInt* const constant_int = llvm::dyn_cast<llvm::ConstantInt>(enum_constant);
                if (constant_int == nullptr)
                    h::common::print_message_and_exit(std::format("In enum '{}', value '{}' is not a constant integer!", enum_declaration.name, enum_value.name));

                std::uint64_t const integer_value = constant_int->getZExtValue();

                elements.push_back(
                    llvm_debug_builder.createEnumerator(enum_value.name.c_str(), integer_value)
                );
            }

            llvm::DIFile* const declaration_llvm_debug_file = get_or_create_llvm_debug_file(llvm_debug_builder, llvm_debug_file, llvm_debug_files, enum_declaration.source_location);

            llvm::DIType* const enum_type = llvm_debug_builder.createEnumerationType(
                &llvm_debug_scope,
                enum_declaration.name.c_str(),
                declaration_llvm_debug_file,
                enum_declaration.source_location.has_value() ? enum_declaration.source_location->line : 0,
                number_of_bits,
                8,
                llvm_debug_builder.getOrCreateArray(elements),
                underlying_type
            );

            llvm_debug_type_map.insert(std::make_pair(enum_declaration.name, enum_type));
        }
    }

    void add_struct_declarations(
        Clang_module_data const& clang_module_data,
        Module const& core_module,
        std::span<Struct_declaration const> const struct_declarations,
        LLVM_type_map& llvm_type_map
    )
    {
        for (Struct_declaration const& struct_declaration : struct_declarations)
        {
            llvm::Type* const converted_type = convert_type(
                clang_module_data,
                core_module.name,
                struct_declaration.name
            );

            llvm_type_map.insert(std::make_pair(struct_declaration.name, converted_type));
        }
    }

    void add_struct_debug_declarations(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        Module const& core_module,
        std::span<Struct_declaration const> const struct_declarations,
        LLVM_debug_type_map& llvm_debug_type_map
    )
    {
        for (Struct_declaration const& struct_declaration : struct_declarations)
        {
            std::string const mangled_name = mangle_struct_name(core_module, struct_declaration.name);

            llvm::DIFile* const declaration_llvm_debug_file = get_or_create_llvm_debug_file(llvm_debug_builder, llvm_debug_file, llvm_debug_files, struct_declaration.source_location);

            llvm::DIType* const value = llvm_debug_builder.createReplaceableCompositeType(
                llvm::dwarf::DW_TAG_structure_type,
                mangled_name,
                &llvm_debug_scope,
                declaration_llvm_debug_file,
                struct_declaration.source_location.has_value() ? struct_declaration.source_location->line : 0
            );

            llvm_debug_type_map.insert(std::make_pair(struct_declaration.name, value));
        }
    }

    void set_struct_debug_definitions(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Struct_declaration const> const struct_declarations,
        Debug_type_database const& debug_type_database,
        LLVM_type_map const& llvm_type_map,
        LLVM_debug_type_map& llvm_debug_type_map
    )
    {
        for (Struct_declaration const& struct_declaration : struct_declarations)
        {
            std::pmr::vector<llvm::DIType*> const llvm_member_debug_types = type_references_to_llvm_debug_types(
                llvm_debug_builder,
                llvm_data_layout,
                core_module,
                struct_declaration.member_types,
                debug_type_database,
                {}
            );

            llvm::StructType* const llvm_struct_type = static_cast<llvm::StructType*>(llvm_type_map.at(struct_declaration.name));

            std::pmr::vector<llvm::Metadata*> elements;
            elements.reserve(llvm_member_debug_types.size());

            std::uint64_t current_offset_in_bits = 0;

            std::uint32_t const struct_line_number = struct_declaration.source_location.has_value() ? struct_declaration.source_location->line : 0;

            for (std::size_t index = 0; index < llvm_member_debug_types.size(); ++index)
            {
                llvm::DIType* const llvm_debug_type = llvm_member_debug_types[index];
                llvm::Type* const llvm_type = llvm_struct_type->getElementType(index);
                std::pmr::string const& member_name = struct_declaration.member_names[index];

                std::optional<std::pmr::vector<Source_position>> const& member_source_positions = struct_declaration.member_source_positions;
                std::uint32_t const member_line_number = member_source_positions.has_value() ? member_source_positions.value()[index].line : struct_line_number;

                llvm::DIType* const llvm_member_debug_type = llvm_debug_builder.createMemberType(
                    &llvm_debug_scope,
                    member_name.c_str(),
                    &llvm_debug_file,
                    member_line_number,
                    llvm_data_layout.getTypeSizeInBits(llvm_type),
                    llvm_data_layout.getABITypeAlign(llvm_type).value() * 8,
                    current_offset_in_bits,
                    llvm::DINode::FlagZero,
                    llvm_debug_type
                );

                elements.push_back(llvm_member_debug_type);

                current_offset_in_bits += llvm_data_layout.getTypeSizeInBits(llvm_type);
            }

            llvm::DIType* const llvm_forward_declaration_debug_type = llvm_debug_type_map.at(struct_declaration.name);

            llvm::TypeSize const size_in_bits = llvm_data_layout.getTypeSizeInBits(llvm_struct_type);

            llvm::DIFile* const declaration_llvm_debug_file = get_or_create_llvm_debug_file(llvm_debug_builder, llvm_debug_file, llvm_debug_files, struct_declaration.source_location);

            llvm::DIType* const llvm_struct_debug_type = llvm_debug_builder.createStructType(
                &llvm_debug_scope,
                llvm_forward_declaration_debug_type->getName(),
                declaration_llvm_debug_file,
                struct_line_number,
                size_in_bits,
                8,
                llvm::DINode::FlagZero,
                nullptr,
                llvm_debug_builder.getOrCreateArray(elements)
            );

            //llvm_debug_builder.replaceTemporary(llvm::TempDIType(llvm_forward_declaration_debug_type), llvm_struct_debug_type);
            llvm_forward_declaration_debug_type->replaceAllUsesWith(llvm_struct_debug_type);
            llvm_debug_type_map[struct_declaration.name] = llvm_struct_debug_type;
        }
    }

    void add_union_declarations(
        Clang_module_data const& clang_module_data,
        Module const& core_module,
        std::span<Union_declaration const> const union_declarations,
        LLVM_type_map& llvm_type_map
    )
    {
        for (Union_declaration const& union_declaration : union_declarations)
        {
            llvm::Type* const converted_type = convert_type(
                clang_module_data,
                core_module.name,
                union_declaration.name
            );

            llvm_type_map.insert(std::make_pair(union_declaration.name, converted_type));
        }
    }

    void add_union_debug_declarations(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        Module const& core_module,
        std::span<Union_declaration const> const union_declarations,
        LLVM_debug_type_map& llvm_debug_type_map
    )
    {
        for (Union_declaration const& union_declaration : union_declarations)
        {
            std::string const mangled_name = mangle_struct_name(core_module, union_declaration.name);

            llvm::DIFile* const declaration_llvm_debug_file = get_or_create_llvm_debug_file(llvm_debug_builder, llvm_debug_file, llvm_debug_files, union_declaration.source_location);

            llvm::DIType* const value = llvm_debug_builder.createReplaceableCompositeType(
                llvm::dwarf::DW_TAG_union_type,
                mangled_name,
                &llvm_debug_scope,
                declaration_llvm_debug_file,
                union_declaration.source_location.has_value() ? union_declaration.source_location->line : 0
            );

            llvm_debug_type_map.insert(std::make_pair(union_declaration.name, value));
        }
    }

    void set_union_debug_definitions(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Union_declaration const> const union_declarations,
        Debug_type_database const& debug_type_database,
        LLVM_type_map const& llvm_type_map,
        LLVM_debug_type_map& llvm_debug_type_map
    )
    {
        for (Union_declaration const& union_declaration : union_declarations)
        {
            std::pmr::vector<llvm::DIType*> const llvm_member_debug_types = type_references_to_llvm_debug_types(
                llvm_debug_builder,
                llvm_data_layout,
                core_module,
                union_declaration.member_types,
                debug_type_database,
                {}
            );

            llvm::StructType* const llvm_union_type = static_cast<llvm::StructType*>(llvm_type_map.at(union_declaration.name));

            std::pmr::vector<llvm::Metadata*> elements;
            elements.reserve(llvm_member_debug_types.size());

            std::uint32_t const union_line_number = union_declaration.source_location.has_value() ? union_declaration.source_location->line : 0;

            for (std::size_t index = 0; index < llvm_member_debug_types.size(); ++index)
            {
                llvm::DIType* const llvm_debug_type = llvm_member_debug_types[index];
                llvm::Type* const llvm_type = llvm_union_type->getElementType(0);
                std::pmr::string const& member_name = union_declaration.member_names[index];

                std::optional<std::pmr::vector<Source_position>> const& member_source_positions = union_declaration.member_source_positions;
                std::uint32_t const member_line_number = member_source_positions.has_value() ? member_source_positions.value()[index].line : union_line_number;

                llvm::DIType* const llvm_member_debug_type = llvm_debug_builder.createMemberType(
                    &llvm_debug_scope,
                    member_name.c_str(),
                    &llvm_debug_file,
                    member_line_number,
                    llvm_data_layout.getTypeSizeInBits(llvm_type),
                    8,
                    0,
                    llvm::DINode::FlagZero,
                    llvm_debug_type
                );

                elements.push_back(llvm_member_debug_type);
            }

            llvm::DIType* const llvm_forward_declaration_debug_type = llvm_debug_type_map.at(union_declaration.name);

            llvm::TypeSize const size_in_bits = llvm_data_layout.getTypeSizeInBits(llvm_union_type);

            llvm::DIFile* const declaration_llvm_debug_file = get_or_create_llvm_debug_file(llvm_debug_builder, llvm_debug_file, llvm_debug_files, union_declaration.source_location);

            llvm::DIType* const llvm_union_debug_type = llvm_debug_builder.createUnionType(
                &llvm_debug_scope,
                llvm_forward_declaration_debug_type->getName(),
                declaration_llvm_debug_file,
                union_line_number,
                size_in_bits,
                8,
                llvm::DINode::FlagZero,
                llvm_debug_builder.getOrCreateArray(elements)
            );

            //llvm_debug_builder.replaceTemporary(llvm::TempDIType(llvm_forward_declaration_debug_type), llvm_union_debug_type);
            llvm_forward_declaration_debug_type->replaceAllUsesWith(llvm_union_debug_type);
            llvm_debug_type_map[union_declaration.name] = llvm_union_debug_type;
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

    Debug_type_database create_debug_type_database(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_scope,
        llvm::DataLayout const& llvm_data_layout
    )
    {
        return
        {
            .builtin = create_debug_builtin_types(llvm_debug_builder, llvm_scope, llvm_data_layout),
            .name_to_llvm_debug_type = {}
        };
    }

    void add_module_types(
        Type_database& type_database,
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Clang_module_data const& clang_module_data,
        Module const& core_module
    )
    {
        LLVM_type_map& llvm_type_map = type_database.name_to_llvm_type[core_module.name];

        add_enum_types(llvm_context, core_module.export_declarations.enum_declarations, llvm_type_map);
        add_enum_types(llvm_context, core_module.internal_declarations.enum_declarations, llvm_type_map);

        add_struct_declarations(clang_module_data, core_module, core_module.export_declarations.struct_declarations, llvm_type_map);
        add_struct_declarations(clang_module_data, core_module, core_module.internal_declarations.struct_declarations, llvm_type_map);

        add_union_declarations(clang_module_data, core_module, core_module.export_declarations.union_declarations, llvm_type_map);
        add_union_declarations(clang_module_data, core_module, core_module.internal_declarations.union_declarations, llvm_type_map);

        add_alias_types(llvm_context, llvm_data_layout, core_module.export_declarations.alias_type_declarations, core_module, type_database, llvm_type_map);
        add_alias_types(llvm_context, llvm_data_layout, core_module.internal_declarations.alias_type_declarations, core_module, type_database, llvm_type_map);
    }

    void add_module_debug_types(
        Debug_type_database& debug_type_database,
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DIScope& llvm_debug_scope,
        llvm::DIFile& llvm_debug_file,
        std::unordered_map<std::filesystem::path, llvm::DIFile*>& llvm_debug_files,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::pmr::vector<llvm::Constant*>> const& enum_value_constants,
        Type_database const& type_database
    )
    {
        LLVM_debug_type_map& llvm_debug_type_map = debug_type_database.name_to_llvm_debug_type[core_module.name];
        LLVM_type_map const& llvm_type_map = type_database.name_to_llvm_type.at(core_module.name);

        add_enum_debug_types(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, core_module.export_declarations.enum_declarations, enum_value_constants, llvm_debug_type_map);
        add_enum_debug_types(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, core_module.internal_declarations.enum_declarations, enum_value_constants, llvm_debug_type_map);

        add_struct_debug_declarations(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, core_module, core_module.export_declarations.struct_declarations, llvm_debug_type_map);
        add_struct_debug_declarations(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, core_module, core_module.internal_declarations.struct_declarations, llvm_debug_type_map);

        add_union_debug_declarations(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, core_module, core_module.export_declarations.union_declarations, llvm_debug_type_map);
        add_union_debug_declarations(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, core_module, core_module.internal_declarations.union_declarations, llvm_debug_type_map);

        add_alias_debug_types(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, core_module.export_declarations.alias_type_declarations, core_module, type_database, debug_type_database, llvm_debug_type_map);
        add_alias_debug_types(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, core_module.internal_declarations.alias_type_declarations, core_module, type_database, debug_type_database, llvm_debug_type_map);

        set_struct_debug_definitions(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, core_module, core_module.export_declarations.struct_declarations, debug_type_database, llvm_type_map, llvm_debug_type_map);
        set_struct_debug_definitions(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, core_module, core_module.internal_declarations.struct_declarations, debug_type_database, llvm_type_map, llvm_debug_type_map);

        set_union_debug_definitions(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, core_module, core_module.export_declarations.union_declarations, debug_type_database, llvm_type_map, llvm_debug_type_map);
        set_union_debug_definitions(llvm_debug_builder, llvm_debug_scope, llvm_debug_file, llvm_debug_files, llvm_data_layout, core_module, core_module.internal_declarations.union_declarations, debug_type_database, llvm_type_map, llvm_debug_type_map);
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

    llvm::DIType* fundamental_type_to_llvm_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        Fundamental_type const type,
        Debug_builtin_types const& debug_builtin_types
    )
    {
        switch (type)
        {
        case Fundamental_type::Bool:
            return llvm_debug_builder.createBasicType("Bool", 1, llvm::dwarf::DW_ATE_boolean);
        case Fundamental_type::Byte:
            return llvm_debug_builder.createBasicType("Byte", 8, llvm::dwarf::DW_ATE_unsigned_char);
        case Fundamental_type::Float16:
            return llvm_debug_builder.createBasicType("Float16", 16, llvm::dwarf::DW_ATE_float);
        case Fundamental_type::Float32:
            return llvm_debug_builder.createBasicType("Float32", 32, llvm::dwarf::DW_ATE_float);
        case Fundamental_type::Float64:
            return llvm_debug_builder.createBasicType("Float64", 64, llvm::dwarf::DW_ATE_float);
        case Fundamental_type::String:
            return debug_builtin_types.string;
        case Fundamental_type::C_bool:
            return llvm_debug_builder.createBasicType("C_bool", 8, llvm::dwarf::DW_ATE_unsigned_char);
        case Fundamental_type::C_char:
            return llvm_debug_builder.createBasicType("C_char", 8, llvm::dwarf::DW_ATE_signed_char);
        case Fundamental_type::C_schar:
            return llvm_debug_builder.createBasicType("C_schar", 8, llvm::dwarf::DW_ATE_signed_char);
        case Fundamental_type::C_uchar:
            return llvm_debug_builder.createBasicType("C_uchar", 8, llvm::dwarf::DW_ATE_unsigned_char);
        case Fundamental_type::C_short:
            return llvm_debug_builder.createBasicType("C_short", 16, llvm::dwarf::DW_ATE_signed);
        case Fundamental_type::C_ushort:
            return llvm_debug_builder.createBasicType("C_short", 16, llvm::dwarf::DW_ATE_unsigned);
        case Fundamental_type::C_int:
            return llvm_debug_builder.createBasicType("c_int", 32, llvm::dwarf::DW_ATE_signed);
        case Fundamental_type::C_uint:
            return llvm_debug_builder.createBasicType("C_uint", 32, llvm::dwarf::DW_ATE_unsigned);
        case Fundamental_type::C_long:
            return llvm_debug_builder.createBasicType("C_long", 32, llvm::dwarf::DW_ATE_signed);
        case Fundamental_type::C_ulong:
            return llvm_debug_builder.createBasicType("C_ulong", 32, llvm::dwarf::DW_ATE_unsigned);
        case Fundamental_type::C_longlong:
            return llvm_debug_builder.createBasicType("C_longlong", 64, llvm::dwarf::DW_ATE_signed);
        case Fundamental_type::C_ulonglong:
            return llvm_debug_builder.createBasicType("C_ulonglong", 64, llvm::dwarf::DW_ATE_unsigned);
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

    llvm::DIType* integer_type_to_llvm_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        Integer_type const type
    )
    {
        std::string const name = std::format("{}{}", type.is_signed ? "Int" : "Uint", type.number_of_bits);
        unsigned const encoding = type.is_signed ? llvm::dwarf::DW_ATE_signed : llvm::dwarf::DW_ATE_unsigned;
        return llvm_debug_builder.createBasicType(name, type.number_of_bits, encoding);
    }

    llvm::Type* pointer_type_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        Pointer_type const type,
        Type_database const& type_database
    )
    {
        llvm::Type* pointed_type = !type.element_type.empty() ? type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, type.element_type[0], type_database) : llvm::PointerType::get(llvm::Type::getInt8Ty(llvm_context), 0);
        return pointed_type->getPointerTo();
    }

    llvm::DIType* pointer_type_to_llvm_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        Pointer_type const type,
        Debug_type_database const& debug_type_database
    )
    {
        llvm::DIType* const pointed_type = !type.element_type.empty() ? type_reference_to_llvm_debug_type(llvm_debug_builder, llvm_data_layout, core_module, type.element_type[0], debug_type_database) : nullptr;
        return llvm_debug_builder.createPointerType(pointed_type, llvm_data_layout.getPointerSizeInBits());
    }

    llvm::Type* type_reference_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& current_module,
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
            llvm::Type* const llvm_element_type = type_reference_to_llvm_type(llvm_context, llvm_data_layout, current_module, data.value_type, type_database);
            llvm::ArrayType* const llvm_array_type = llvm::ArrayType::get(llvm_element_type, data.size);
            return llvm_array_type;
        }
        else if (std::holds_alternative<Custom_type_reference>(type_reference.data))
        {
            Custom_type_reference const& data = std::get<Custom_type_reference>(type_reference.data);
            std::string_view const module_name = find_module_name(current_module, data.module_reference);

            LLVM_type_map const& llvm_type_map = type_database.name_to_llvm_type.at(module_name.data());
            auto const location = llvm_type_map.find(data.name);
            if (location == llvm_type_map.end())
                return llvm::StructType::create(llvm_context, "__hl_opaque_type");

            llvm::Type* const llvm_type = location->second;
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
            return pointer_type_to_llvm_type(llvm_context, llvm_data_layout, current_module, data, type_database);
        }

        throw std::runtime_error{ "Not implemented." };
    }

    llvm::Type* type_reference_to_llvm_type(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Type_reference const> const type_reference,
        Type_database const& type_database
    )
    {
        if (type_reference.empty())
            return llvm::Type::getVoidTy(llvm_context);

        return type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, type_reference[0], type_database);
    }

    std::pmr::vector<llvm::Type*> type_references_to_llvm_types(
        llvm::LLVMContext& llvm_context,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
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
            [&](Type_reference const& type_reference) -> llvm::Type* { return type_reference_to_llvm_type(llvm_context, llvm_data_layout, core_module, type_reference, type_database); }
        );

        return output;
    }

    llvm::DIType* type_reference_to_llvm_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        Module const& current_module,
        Type_reference const& type_reference,
        Debug_type_database const& debug_type_database
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
            std::string_view const module_name = find_module_name(current_module, data.module_reference);
            LLVM_debug_type_map const& llvm_debug_type_map = debug_type_database.name_to_llvm_debug_type.at(module_name.data());
            llvm::DIType* const llvm_debug_type = llvm_debug_type_map.at(data.name);
            return llvm_debug_type;
        }
        else if (std::holds_alternative<Fundamental_type>(type_reference.data))
        {
            Fundamental_type const data = std::get<Fundamental_type>(type_reference.data);
            return fundamental_type_to_llvm_debug_type(llvm_debug_builder, data, debug_type_database.builtin);
        }
        else if (std::holds_alternative<Function_type>(type_reference.data))
        {
            Function_type const& data = std::get<Function_type>(type_reference.data);
            throw std::runtime_error{ "Not implemented." };
        }
        else if (std::holds_alternative<Integer_type>(type_reference.data))
        {
            Integer_type const& data = std::get<Integer_type>(type_reference.data);
            return integer_type_to_llvm_debug_type(llvm_debug_builder, data);
        }
        else if (std::holds_alternative<Pointer_type>(type_reference.data))
        {
            Pointer_type const& data = std::get<Pointer_type>(type_reference.data);
            return pointer_type_to_llvm_debug_type(llvm_debug_builder, llvm_data_layout, current_module, data, debug_type_database);
        }

        throw std::runtime_error{ "Not implemented." };
    }

    llvm::DIType* type_reference_to_llvm_debug_type(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Type_reference const> const type_reference,
        Debug_type_database const& debug_type_database
    )
    {
        if (type_reference.empty())
            return nullptr;

        return type_reference_to_llvm_debug_type(llvm_debug_builder, llvm_data_layout, core_module, type_reference[0], debug_type_database);
    }

    std::pmr::vector<llvm::DIType*> type_references_to_llvm_debug_types(
        llvm::DIBuilder& llvm_debug_builder,
        llvm::DataLayout const& llvm_data_layout,
        Module const& core_module,
        std::span<Type_reference const> const type_references,
        Debug_type_database const& debug_type_database,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<llvm::DIType*> output{ output_allocator };
        output.resize(type_references.size());

        std::transform(
            type_references.begin(),
            type_references.end(),
            output.begin(),
            [&](Type_reference const& type_reference) -> llvm::DIType* { return type_reference_to_llvm_debug_type(llvm_debug_builder, llvm_data_layout, core_module, type_reference, debug_type_database); }
        );

        return output;
    }

    Struct_layout calculate_struct_layout(
        llvm::DataLayout const& llvm_data_layout,
        Type_database const& type_database,
        std::string_view const module_name,
        std::string_view const struct_name
    )
    {
        LLVM_type_map const& llvm_type_map = type_database.name_to_llvm_type.at(module_name.data());
        auto const llvm_type_location = llvm_type_map.find(struct_name.data());
        if (llvm_type_location == llvm_type_map.end())
            h::common::print_message_and_exit(std::format("Could not calculate struct layout of '{}.{}'. Could not find it!", module_name, struct_name));

        llvm::Type* const llvm_type = llvm_type_location->second;
        if (llvm_type == nullptr)
            h::common::print_message_and_exit(std::format("Could not calculate struct layout of '{}.{}'. llvm::Type is null!", module_name, struct_name));

        if (!llvm::StructType::classof(llvm_type))
            h::common::print_message_and_exit(std::format("Could not calculate struct layout of '{}.{}'. llvm::Type is not llvm::StructType!", module_name, struct_name));


        llvm::StructType* const llvm_struct_type = static_cast<llvm::StructType*>(llvm_type);
        llvm::StructLayout const* const llvm_struct_layout = llvm_data_layout.getStructLayout(llvm_struct_type);

        std::uint64_t const struct_size = llvm_struct_layout->getSizeInBytes();
        std::uint64_t const struct_alignment = llvm_struct_layout->getAlignment().value();

        std::pmr::vector<Struct_member_layout> members;
        members.reserve(llvm_struct_type->getNumElements());

        for (unsigned index = 0; index < llvm_struct_type->getNumElements(); ++index)
        {
            std::uint64_t const member_offset = llvm_struct_layout->getElementOffset(index);

            llvm::Type* const member_type = llvm_struct_type->getElementType(index);
            std::uint64_t const member_size = llvm_data_layout.getTypeStoreSize(member_type);
            std::uint64_t const member_alignment = llvm_data_layout.getABITypeAlign(member_type).value();

            members.push_back(
                {
                    .offset = member_offset,
                    .size = member_size,
                    .alignment = member_alignment
                }
            );
        }

        return
        {
            .size = struct_size,
            .alignment = struct_alignment,
            .members = std::move(members)
        };
    }
}
