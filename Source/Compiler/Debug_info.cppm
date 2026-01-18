module;

#include <llvm/IR/DIBuilder.h>
#include <llvm/IR/IRBuilder.h>

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>

export module h.compiler.debug_info;

import h.compiler.types;
import h.core;

namespace h::compiler
{
    export struct Debug_info
    {
        std::unique_ptr<llvm::DIBuilder> llvm_builder;
        Debug_type_database type_database;
        llvm::DICompileUnit* main_llvm_compile_unit;
        std::pmr::vector<llvm::DIScope*> llvm_scopes;
    };

    export llvm::DIScope* get_debug_scope(
        Debug_info& debug_info
    );

    export void push_debug_scope(
        Debug_info& debug_info,
        llvm::DIScope* scope
    );

    export void push_debug_lexical_block_scope(
        Debug_info& debug_info,
        Source_position const source_position
    );

    export void pop_debug_scope(
        Debug_info& debug_info
    );

    export void set_debug_location(
        llvm::IRBuilder<>& llvm_builder,
        Debug_info& debug_info,
        unsigned const line,
        unsigned const column
    );

    export void unset_debug_location(
        llvm::IRBuilder<>& llvm_builder
    );

    export void set_debug_location_at_statement(
        llvm::IRBuilder<>& llvm_builder,
        Debug_info& debug_info,
        h::Statement const& statement
    );

    export void set_debug_location_at_range(
        llvm::IRBuilder<>& llvm_builder,
        Debug_info& debug_info,
        std::optional<h::Source_range> const& source_range
    );
}
