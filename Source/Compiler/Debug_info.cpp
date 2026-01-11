module;

#include <llvm/IR/DIBuilder.h>
#include <llvm/IR/IRBuilder.h>

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>

module h.compiler.debug_info;

import h.compiler.types;
import h.core;

namespace h::compiler
{
    llvm::DIScope* get_debug_scope(
        Debug_info& debug_info
    )
    {
        return debug_info.llvm_scopes.empty() ? debug_info.main_llvm_compile_unit : debug_info.llvm_scopes.back();
    }

    void push_debug_scope(
        Debug_info& debug_info,
        llvm::DIScope* scope
    )
    {
        debug_info.llvm_scopes.push_back(scope);
    }

    void push_debug_lexical_block_scope(
        Debug_info& debug_info,
        Source_position const source_position
    )
    {
        llvm::DIScope* const parent_scope = get_debug_scope(
            debug_info
        );

        llvm::DILexicalBlock* const lexical_block = debug_info.llvm_builder->createLexicalBlock(
            parent_scope,
            parent_scope->getFile(),
            source_position.line,
            source_position.column
        );

        push_debug_scope(debug_info, lexical_block);
    }

    void pop_debug_scope(
        Debug_info& debug_info
    )
    {
        debug_info.llvm_scopes.pop_back();
    }

    void set_debug_location(
        llvm::IRBuilder<>& llvm_builder,
        Debug_info& debug_info,
        unsigned const line,
        unsigned const column
    )
    {
        llvm::DIScope* const scope = get_debug_scope(debug_info);

        llvm::DILocation* debug_location = llvm::DILocation::get(
            scope->getContext(),
            line,
            column,
            scope
        );

        llvm_builder.SetCurrentDebugLocation(debug_location);
    }

    void unset_debug_location(
        llvm::IRBuilder<>& llvm_builder
    )
    {
        llvm_builder.SetCurrentDebugLocation(llvm::DebugLoc{});
    }

    void set_debug_location_at_statement(
        llvm::IRBuilder<>& llvm_builder,
        Debug_info& debug_info,
        h::Statement const& statement
    )
    {
        if (!statement.expressions.empty())
        {
            std::optional<h::Source_range> const& source_range = statement.expressions[0].source_range;
            set_debug_location_at_range(llvm_builder, debug_info, source_range);
        }
    }
    
    void set_debug_location_at_range(
        llvm::IRBuilder<>& llvm_builder,
        Debug_info& debug_info,
        std::optional<h::Source_range> const& source_range
    )
    {
        if (source_range.has_value())
            set_debug_location(llvm_builder, debug_info, source_range->start.line, source_range->start.column);
    }
}
