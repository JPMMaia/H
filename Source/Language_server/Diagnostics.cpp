module;

#include <filesystem>
#include <format>
#include <memory_resource>
#include <span>
#include <string>
#include <string_view>
#include <vector>

#include <lsp/types.h>

module h.language_server.diagnostics;

import h.compiler.diagnostic;
import h.core;
import h.parser.parse_tree;

namespace h::language_server
{
    static std::pmr::string create_parser_diagnostic_message(
        h::parser::Parse_tree const& tree,
        h::parser::Parse_node const& node,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        if (h::parser::is_error_node(node))
        {
            return std::pmr::string{"Unexpected token.", output_allocator};
        }
        else
        {
            std::string_view const node_value = h::parser::get_node_value(tree, node);
            return std::pmr::string{std::format("Missing '{}'.", node_value), output_allocator};
        }
    }

    std::pmr::vector<h::compiler::Diagnostic> create_parser_diagnostics(
        std::span<std::filesystem::path const> const core_module_source_file_paths,
        std::span<h::parser::Parse_tree const> const core_module_parse_trees,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<h::compiler::Diagnostic> diagnostics{temporaries_allocator};

        for (std::size_t core_module_index = 0; core_module_index < core_module_parse_trees.size(); ++core_module_index)
        {
            std::filesystem::path const& source_file_path = core_module_source_file_paths[core_module_index];
            h::parser::Parse_tree const& parse_tree = core_module_parse_trees[core_module_index];
            h::parser::Parse_node const& root_node = h::parser::get_root_node(parse_tree);

            if (h::parser::has_errors(root_node))
            {
                std::pmr::vector<h::parser::Parse_node> const error_or_missing_nodes = h::parser::get_error_or_missing_nodes(
                    parse_tree,
                    root_node,
                    temporaries_allocator,
                    temporaries_allocator
                );

                for (h::parser::Parse_node const& node : error_or_missing_nodes)
                {
                    h::Source_range const range = h::parser::get_node_source_range(node);
                    std::pmr::string message = create_parser_diagnostic_message(parse_tree, node, output_allocator);

                    h::compiler::Diagnostic diagnostic
                    {
                        .file_path = source_file_path,
                        .range = range,
                        .source = h::compiler::Diagnostic_source::Parser,
                        .severity = h::compiler::Diagnostic_severity::Error,
                        .message = std::move(message),
                        .related_information = {},
                    };

                    diagnostics.push_back(std::move(diagnostic));
                }
            }
        }

        return std::pmr::vector<h::compiler::Diagnostic>{std::move(diagnostics), output_allocator};
    }

    std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> create_document_diagnostics_report(
        std::span<h::compiler::Diagnostic const> const diagnostics,
        std::span<std::filesystem::path const> const core_module_source_file_paths,
        std::pmr::polymorphic_allocator<> const& output_allocator
    )
    {
        std::pmr::vector<lsp::WorkspaceFullDocumentDiagnosticReport> items{output_allocator};
        items.reserve(core_module_source_file_paths.size());

        for (std::filesystem::path const& source_file_path : core_module_source_file_paths)
        {
            lsp::WorkspaceFullDocumentDiagnosticReport document_report = {};
            document_report.uri = lsp::DocumentUri::fromPath(source_file_path.generic_string());
            document_report.version = nullptr; // TODO

            document_report.items = {};

            for (h::compiler::Diagnostic const& core_diagnostic : diagnostics)
            {
                if (!core_diagnostic.file_path.has_value())
                    continue;

                if (core_diagnostic.file_path.value() == source_file_path)
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
