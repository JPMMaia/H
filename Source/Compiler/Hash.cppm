module;

#include <xxhash.h>

#include <cstddef>
#include <memory_resource>
#include <string>
#include <string_view>
#include <unordered_map>

export module h.compiler.hash;

import h.core;

namespace h::compiler
{
    void update_hash_with_declaration(
        XXH64_state_t* const state,
        h::Module const& core_module,
        std::string_view const declaration_name
    );

    void update_hash(
        XXH64_state_t* const state,
        std::string_view const string
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Function_type const& function_type,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Type_reference const& type_reference,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement,
        h::Expression const& expression,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement,
        Expression_index const expression,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Statement const& statement,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Alias_type_declaration const& declaration,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Enum_declaration const& declaration,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Struct_declaration const& declaration,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Union_declaration const& declaration,
        h::Module const& current_core_module
    );

    void update_hash(
        XXH64_state_t* const state,
        h::Function_declaration const& declaration,
        h::Module const& current_core_module
    );

    export XXH64_hash_t hash_alias_type_declaration(
        XXH64_state_t* const state,
        h::Alias_type_declaration const& declaration,
        h::Module const& current_core_module
    );

    export XXH64_hash_t hash_enum_declaration(
        XXH64_state_t* const state,
        h::Enum_declaration const& declaration,
        h::Module const& current_core_module
    );

    export XXH64_hash_t hash_struct_declaration(
        XXH64_state_t* const state,
        h::Struct_declaration const& declaration,
        h::Module const& current_core_module
    );

    export XXH64_hash_t hash_union_declaration(
        XXH64_state_t* const state,
        h::Union_declaration const& declaration,
        h::Module const& current_core_module
    );

    export XXH64_hash_t hash_function_declaration(
        XXH64_state_t* const state,
        h::Function_declaration const& declaration,
        h::Module const& current_core_module
    );

    export using Symbol_name_to_hash = std::pmr::unordered_map<std::pmr::string, std::uint64_t>;

    export Symbol_name_to_hash hash_module_declarations(
        h::Module const& core_module,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
