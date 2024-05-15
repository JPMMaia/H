module;

#include <xxhash.h>

#include <cstdio>
#include <filesystem>
#include <format>
#include <memory_resource>
#include <optional>
#include <variant>
#include <vector>
#include <unordered_map>

module h.compiler.recompilation;

import h.common;
import h.core;
import h.json_serializer;
import h.parser;

namespace h::compiler
{
    static inline void update_hash(
        XXH64_state_t* const state,
        XXH_NOESCAPE void const* const input,
        size_t const size
    )
    {
        if (XXH64_update(state, input, size) == XXH_ERROR)
            h::common::print_message_and_exit("Could not update xxhash state!");
    }

    void update_hash(
        XXH64_state_t* const state,
        std::string_view const string
    )
    {
        update_hash(state, string.data(), string.size());
    }

    void update_hash(
        XXH64_state_t* const state,
        h::Type_reference const& type_reference
    )
    {
        if (std::holds_alternative<h::Builtin_type_reference>(type_reference.data))
        {
            h::Builtin_type_reference const& data = std::get<h::Builtin_type_reference>(type_reference.data);
            update_hash(state, data.value);
        }
        else if (std::holds_alternative<h::Constant_array_type>(type_reference.data))
        {
            h::Constant_array_type const& data = std::get<h::Constant_array_type>(type_reference.data);

            for (h::Type_reference const& value_type : data.value_type)
            {
                update_hash(state, value_type);
            }

            update_hash(state, &data.size, sizeof(data.size));
        }
        else if (std::holds_alternative<h::Custom_type_reference>(type_reference.data))
        {
            h::Custom_type_reference const& data = std::get<h::Custom_type_reference>(type_reference.data);
            update_hash(state, data.module_reference.name);
            update_hash(state, data.name);
        }
        else if (std::holds_alternative<h::Fundamental_type>(type_reference.data))
        {
            h::Fundamental_type const data = std::get<h::Fundamental_type>(type_reference.data);
            update_hash(state, &data, sizeof(data));
        }
        else if (std::holds_alternative<h::Function_type>(type_reference.data))
        {
            h::Function_type const& data = std::get<h::Function_type>(type_reference.data);

            for (h::Type_reference const& parameter_type : data.input_parameter_types)
            {
                update_hash(state, parameter_type);
            }

            for (h::Type_reference const& parameter_type : data.output_parameter_types)
            {
                update_hash(state, parameter_type);
            }

            update_hash(state, &data.is_variadic, sizeof(data.is_variadic));
        }
        else if (std::holds_alternative<h::Integer_type>(type_reference.data))
        {
            h::Integer_type const& data = std::get<h::Integer_type>(type_reference.data);
            update_hash(state, &data.number_of_bits, sizeof(data.number_of_bits));
            update_hash(state, &data.is_signed, sizeof(data.is_signed));
        }
        else if (std::holds_alternative<h::Pointer_type>(type_reference.data))
        {
            h::Pointer_type const& data = std::get<h::Pointer_type>(type_reference.data);

            for (h::Type_reference const& element_type : data.element_type)
            {
                update_hash(state, element_type);
            }

            update_hash(state, &data.is_mutable, sizeof(data.is_mutable));
        }
        else
        {
            h::common::print_message_and_exit("Hash of type reference data is not implemented!");
        }
    }

    void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement,
        Expression_index const expression
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement,
        h::Expression const& expression
    )
    {
        if (std::holds_alternative<h::Access_expression>(expression.data))
        {
            h::Access_expression const& data = std::get<h::Access_expression>(expression.data);
            update_hash(state, statement, data.expression);
            update_hash(state, data.member_name);
            update_hash(state, &data.access_type, sizeof(data.access_type));
        }
        else if (std::holds_alternative<h::Binary_expression>(expression.data))
        {
            h::Binary_expression const& data = std::get<h::Binary_expression>(expression.data);
            update_hash(state, statement, data.left_hand_side);
            update_hash(state, statement, data.right_hand_side);
            update_hash(state, &data.operation, sizeof(data.operation));
        }
        else if (std::holds_alternative<h::Cast_expression>(expression.data))
        {
            h::Cast_expression const& data = std::get<h::Cast_expression>(expression.data);
            update_hash(state, statement, data.source);
            update_hash(state, data.destination_type);
            update_hash(state, &data.cast_type, sizeof(data.cast_type));
        }
        else if (std::holds_alternative<h::Constant_expression>(expression.data))
        {
            h::Constant_expression const& data = std::get<h::Constant_expression>(expression.data);
            update_hash(state, data.type);
            update_hash(state, data.data);
        }
        else if (std::holds_alternative<h::Constant_array_expression>(expression.data))
        {
            h::Constant_array_expression const& data = std::get<h::Constant_array_expression>(expression.data);
            update_hash(state, data.type);

            for (h::Statement const& element_statement : data.array_data)
            {
                update_hash(state, element_statement);
            }
        }
        else if (std::holds_alternative<h::Instantiate_expression>(expression.data))
        {
            h::Instantiate_expression const& data = std::get<h::Instantiate_expression>(expression.data);
            update_hash(state, &data.type, sizeof(data.type));

            for (h::Instantiate_member_value_pair const& pair : data.members)
            {
                update_hash(state, pair.member_name);
                update_hash(state, pair.value);
            }
        }
        else if (std::holds_alternative<h::Null_pointer_expression>(expression.data))
        {
            std::uint8_t const null_value = 0;
            update_hash(state, &null_value, sizeof(null_value));
        }
        else if (std::holds_alternative<h::Parenthesis_expression>(expression.data))
        {
            h::Parenthesis_expression const& data = std::get<h::Parenthesis_expression>(expression.data);
            update_hash(state, statement, data.expression);
        }
        else if (std::holds_alternative<h::Unary_expression>(expression.data))
        {
            h::Unary_expression const& data = std::get<h::Unary_expression>(expression.data);
            update_hash(state, statement, data.expression);
            update_hash(state, &data.operation, sizeof(data.operation));
        }
        else if (std::holds_alternative<h::Variable_expression>(expression.data))
        {
            h::Variable_expression const& data = std::get<h::Variable_expression>(expression.data);
            update_hash(state, data.name);
            update_hash(state, &data.access_type, sizeof(data.access_type));
        }
        else
        {
            h::common::print_message_and_exit("Hash of expression type is not implemented!");
        }
    }

    inline void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement,
        Expression_index const expression
    )
    {
        update_hash(state, statement, statement.expressions[expression.expression_index]);
    }

    void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement
    )
    {
        for (h::Expression const& expression : statement.expressions)
        {
            update_hash(state, statement, expression);
        }
    }

    XXH64_hash_t hash_struct_declaration(
        XXH64_state_t* const state,
        h::Struct_declaration const& declaration
    )
    {
        XXH64_hash_t const seed = 0;
        if (XXH64_reset(state, seed) == XXH_ERROR)
            h::common::print_message_and_exit("Could not reset xxhash state!");

        update_hash(state, declaration.name);

        if (declaration.unique_name.has_value())
            update_hash(state, *declaration.unique_name);

        for (h::Type_reference const& type_reference : declaration.member_types)
            update_hash(state, type_reference);

        for (std::pmr::string const& member_name : declaration.member_names)
            update_hash(state, member_name);

        for (h::Statement const& member_default_value : declaration.member_default_values)
            update_hash(state, member_default_value);

        update_hash(state, &declaration.is_packed, sizeof(declaration.is_packed));
        update_hash(state, &declaration.is_literal, sizeof(declaration.is_literal));

        XXH64_hash_t const hash = XXH64_digest(state);
        return hash;
    }

    Symbol_name_to_hash hash_export_interface(
        h::Module const& core_module,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        XXH64_state_t* const state = XXH64_createState();
        if (state == nullptr)
            h::common::print_message_and_exit("Could not initialize xxhash state!");

        std::pmr::unordered_map<std::pmr::string, std::uint64_t> map{ output_allocator };

        for (Struct_declaration const& declaration : core_module.export_declarations.struct_declarations)
        {
            XXH64_hash_t const hash = hash_struct_declaration(state, declaration);
            map.insert(std::make_pair(declaration.name, hash));
        }

        XXH64_freeState(state);

        return map;
    }

    std::optional<std::uint64_t> get_hash(
        Symbol_name_to_hash const& symbol_name_to_hash,
        std::pmr::string const& symbol_name
    )
    {
        auto const location = symbol_name_to_hash.find(symbol_name);
        if (location == symbol_name_to_hash.end())
            return std::nullopt;
        return location->second;
    }

    static std::optional<h::Module> parse_core_module_export_declarations(
        h::parser::Parser const& parser,
        std::filesystem::path const& file_path,
        std::filesystem::path const& build_directory
    )
    {
        std::filesystem::path const parsed_file_path = build_directory / file_path.filename().replace_extension("hl");
        h::parser::parse(parser, file_path, parsed_file_path);

        std::optional<h::Module> core_module = h::json::read_module_export_declarations(parsed_file_path);
        return core_module;
    }

    std::pmr::vector<std::pmr::string> find_modules_to_recompile(
        h::Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path,
        std::pmr::unordered_multimap<std::pmr::string, std::pmr::string> const& module_name_to_reverse_dependencies,
        std::pmr::unordered_map<std::pmr::string, Symbol_name_to_hash> const& module_name_to_symbol_hashes,
        h::parser::Parser const& parser,
        std::filesystem::path const& build_directory
    )
    {
        Symbol_name_to_hash const& previous_symbol_name_to_hash = module_name_to_symbol_hashes.at(core_module.name);
        // TODO do this outside and update
        Symbol_name_to_hash const new_symbol_name_to_hash = hash_export_interface(core_module, {});

        auto const reverse_dependencies_range = module_name_to_reverse_dependencies.equal_range(core_module.name);

        std::pmr::vector<std::pmr::string> modules_to_recompile;
        modules_to_recompile.reserve(std::distance(reverse_dependencies_range.first, reverse_dependencies_range.second));

        for (auto iterator = reverse_dependencies_range.first; iterator != reverse_dependencies_range.second; ++iterator)
        {
            std::pmr::string const& reverse_dependency_name = iterator->second;
            std::filesystem::path const& reverse_dependency_file_path = module_name_to_file_path.at(reverse_dependency_name);

            std::optional<h::Module> const reverse_dependency = parse_core_module_export_declarations(parser, reverse_dependency_file_path, build_directory);
            if (!reverse_dependency)
            {
                std::puts(std::format("Could not read '{}'!", reverse_dependency_file_path.generic_string()).c_str());
                continue;
            }

            auto const alias_import_location = std::find_if(
                reverse_dependency->dependencies.alias_imports.begin(),
                reverse_dependency->dependencies.alias_imports.end(),
                [&](Import_module_with_alias const& alias_import) -> bool { return alias_import.module_name == core_module.name; }
            );
            if (alias_import_location == reverse_dependency->dependencies.alias_imports.end())
                continue;

            for (std::pmr::string const& usage : alias_import_location->usages)
            {
                std::optional<std::uint64_t> const previous_hash = get_hash(previous_symbol_name_to_hash, usage);
                std::optional<std::uint64_t> const new_hash = get_hash(new_symbol_name_to_hash, usage);

                if (previous_hash != new_hash)
                {
                    modules_to_recompile.push_back(reverse_dependency_name);
                    break;
                }
            }
        }

        return modules_to_recompile;
    }
}
