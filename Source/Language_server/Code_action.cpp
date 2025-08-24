module;

#include <filesystem>
#include <optional>
#include <variant>
#include <vector>

#include <lsp/types.h>

module h.language_server.code_action;

import h.compiler.analysis;
import h.core;
import h.core.declarations;
import h.core.types;
import h.language_server.core;
import h.language_server.location;
import h.parser.parse_tree;

namespace h::language_server
{
    lsp::TextDocument_CodeActionResult compute_code_actions(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        lsp::Range const range,
        lsp::CodeActionContext const& context
    )
    {
        return nullptr;
    }
}
