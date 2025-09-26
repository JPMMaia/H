module;

#include <span>

#include <lsp/types.h>

export module h.language_server.code_action;

import h.compiler.diagnostic;
import h.core;
import h.core.declarations;
import h.parser.parse_tree;

namespace h::language_server
{
    export lsp::TextDocument_CodeActionResult compute_code_actions(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        std::span<h::compiler::Diagnostic const> const diagnostics,
        lsp::Range const range,
        lsp::CodeActionContext const& context
    );
}
