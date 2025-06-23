module;

#include <span>
#include <vector>

#include <lsp/types.h>

module h.language_server.diagnostics;

import h.compiler.diagnostic;
import h.core;

namespace h::language_server
{
    std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> create_document_diagnostics_report(
        std::span<h::compiler::Diagnostic const> const diagnostics,
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> items{output_allocator};
        items.reserve(core_modules.size());

        for (h::Module const& core_module : core_modules)
        {
            if (!core_module.source_file_path.has_value())
                continue;

            lsp::WorkspaceFullDocumentDiagnosticReport document_report = {};
            document_report.uri = lsp::DocumentUri::fromPath(core_module.source_file_path.value().generic_string());
            document_report.version = nullptr; // TODO

            document_report.items = {};

            for (h::compiler::Diagnostic const& core_diagnostic : diagnostics)
            {
                if (!core_diagnostic.file_path.has_value())
                    continue;

                if (core_diagnostic.file_path.value() == core_module.source_file_path.value())
                {
                    lsp::Diagnostic lsp_diagnostic = to_lsp_diagnostic(core_diagnostic);

                    document_report.items.push_back(std::move(lsp_diagnostic));
                }
            }

            items.push_back(std::move(document_report));
        }

        return items;
    }

    lsp::Position to_lsp_position(
        h::Source_position const& input
    )
    {
        return lsp::Position
        {
            .line = input.line - 1,
            .character = input.column - 1,
        };
    }

    lsp::Range to_lsp_range(
        h::Source_range const& input
    )
    {
        return lsp::Range
        {
            .start = to_lsp_position(input.start),
            .end = to_lsp_position(input.end),
        };
    }

    lsp::DiagnosticSeverity to_lsp_diagnostic_severity(
        h::compiler::Diagnostic_severity const input
    )
    {
        switch (input)
        {
            case h::compiler::Diagnostic_severity::Warning:
                return lsp::DiagnosticSeverity::Warning;
            case h::compiler::Diagnostic_severity::Error:
                return lsp::DiagnosticSeverity::Error;
            case h::compiler::Diagnostic_severity::Information:
                return lsp::DiagnosticSeverity::Information;
            case h::compiler::Diagnostic_severity::Hint:
                return lsp::DiagnosticSeverity::Hint;
            default:
                return lsp::DiagnosticSeverity::Error;
        }
    }

    lsp::Diagnostic to_lsp_diagnostic(
        h::compiler::Diagnostic const& input
    )
    {
        return lsp::Diagnostic
        {
            .range = to_lsp_range(input.range),
            .message = lsp::String{input.message},
            .severity = to_lsp_diagnostic_severity(input.severity),
        };
    }
}
