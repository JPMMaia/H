module;

#include <memory_resource>
#include <span>
#include <vector>

#include <lsp/types.h>

export module h.language_server.diagnostics;

import h.compiler.diagnostic;
import h.core;

namespace h::language_server
{
    export std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> create_document_diagnostics_report(
        std::span<h::compiler::Diagnostic const> const diagnostics,
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    lsp::Diagnostic to_lsp_diagnostic(
        h::compiler::Diagnostic const& input
    );
}
