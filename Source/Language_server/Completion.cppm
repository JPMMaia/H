module;

#include <span>

#include <lsp/types.h>

export module h.language_server.completion;

import h.compiler.artifact;
import h.core;
import h.core.declarations;
import h.parser.parse_tree;

namespace h::language_server
{
    export lsp::TextDocument_CompletionResult compute_completion(
        std::span<h::compiler::Artifact const> const artifacts,
        std::span<h::Module const> const header_modules,
        std::span<h::Module const> const core_modules,
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        lsp::Position const position
    );
}
