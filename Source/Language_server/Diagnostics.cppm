module;

#include <filesystem>
#include <memory_resource>
#include <optional>
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
        std::filesystem::path const& source_file_path,
        h::parser::Parse_tree const& parse_tree,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export lsp::WorkspaceFullDocumentDiagnosticReport create_full_document_diagnostics_report(
        std::filesystem::path const& source_file_path,
        std::optional<int> const version,
        std::string_view const result_id,
        std::span<h::compiler::Diagnostic const> const diagnostics
    );

    export lsp::WorkspaceUnchangedDocumentDiagnosticReport create_unchanged_document_diagnostics_report(
        std::filesystem::path const& source_file_path,
        std::optional<int> const version,
        std::string_view const previous_result_id
    );

    export std::pmr::vector<lsp::WorkspaceDocumentDiagnosticReport> create_all_diagnostics(
        std::span<std::filesystem::path const> const core_module_source_file_paths,
        std::span<std::optional<int> const> const core_module_versions,
        std::pmr::vector<std::pmr::vector<h::compiler::Diagnostic>>& core_module_diagnostics,
        std::span<lsp::PreviousResultId const> const previous_result_ids,
        std::span<std::pmr::string> const core_module_diagnostic_result_ids,
        std::pmr::vector<bool>& core_module_diagnostic_dirty_flags,
        std::span<h::parser::Parse_tree const> const core_module_parse_trees,
        std::span<h::Module const> const header_modules,
        std::span<h::Module> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    lsp::Diagnostic to_lsp_diagnostic(
        h::compiler::Diagnostic const& input
    );
}
