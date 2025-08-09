module;

#include <lsp/types.h>

export module h.language_server.completion;

import h.core;
import h.core.declarations;
import h.parser.parse_tree;

namespace h::language_server
{
    export lsp::TextDocument_CompletionResult compute_completion(
        Declaration_database const& declaration_database,
        h::parser::Parse_tree const& parse_tree,
        h::Module const& core_module,
        lsp::Position const position
    );
}
