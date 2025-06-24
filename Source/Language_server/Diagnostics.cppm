module;

#include <filesystem>
#include <memory_resource>
#include <span>
#include <vector>

#include <lsp/types.h>

export module h.language_server.diagnostics;

import h.compiler.diagnostic;
import h.core;
import h.parser.parse_tree;

namespace h::language_server
{
    export std::pmr::vector<h::compiler::Diagnostic> create_parser_diagnostics(
        std::span<std::filesystem::path const> const core_module_source_file_paths,
        std::span<h::parser::Parse_tree const> const core_module_parse_trees,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> create_document_diagnostics_report(
        std::span<h::compiler::Diagnostic const> const diagnostics,
        std::span<std::filesystem::path const> const core_module_source_file_paths,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    lsp::Diagnostic to_lsp_diagnostic(
        h::compiler::Diagnostic const& input
    );
}
