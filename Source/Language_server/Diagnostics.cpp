module;

#include <cstdlib>
#include <filesystem>
#include <format>
#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

#include <lsp/types.h>

module h.language_server.diagnostics;

import h.compiler;
import h.compiler.analysis;
import h.compiler.diagnostic;
import h.core;
import h.core.declarations;
import h.language_server.core;
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
        std::filesystem::path const& source_file_path,
        h::parser::Parse_tree const& parse_tree,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        h::parser::Parse_node const& root_node = h::parser::get_root_node(parse_tree);

        if (h::parser::has_errors(root_node))
        {
            std::pmr::vector<h::parser::Parse_node> const error_or_missing_nodes = h::parser::get_error_or_missing_nodes(
                parse_tree,
                root_node,
                temporaries_allocator,
                temporaries_allocator
            );

            std::pmr::vector<h::compiler::Diagnostic> diagnostics{output_allocator};
            diagnostics.reserve(error_or_missing_nodes.size());

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

            return diagnostics;
        }

        return {};
    }

    lsp::WorkspaceFullDocumentDiagnosticReport create_full_document_diagnostics_report(
        std::filesystem::path const& source_file_path,
        std::optional<int> const version,
        std::string_view const result_id,
        std::span<h::compiler::Diagnostic const> const diagnostics
    )
    {
        lsp::WorkspaceFullDocumentDiagnosticReport document_report = {};
        document_report.uri = lsp::DocumentUri::fromPath(source_file_path.generic_string());
        document_report.resultId = std::string{result_id};

        if (version.has_value())
            document_report.version = version.value();

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

        return document_report;
    }

    lsp::WorkspaceUnchangedDocumentDiagnosticReport create_unchanged_document_diagnostics_report(
        std::filesystem::path const& source_file_path,
        std::optional<int> const version,
        std::string_view const previous_result_id
    )
    {
        lsp::WorkspaceUnchangedDocumentDiagnosticReport item = {};
        item.resultId = std::string{ previous_result_id };
        item.uri = lsp::DocumentUri::fromPath(source_file_path.generic_string());
        if (version.has_value())
            item.version = version.value();

        return item;
    }

    static bool is_any_dependency_dirty(
        std::pmr::vector<bool> const& dirty_diagnostics,
        std::span<h::Module const* const> sorted_core_modules,
        h::Module const& core_module,
        std::size_t const& core_module_index
    )
    {
        for (h::Import_module_with_alias const& alias : core_module.dependencies.alias_imports)
        {
            for (std::size_t index = 0; index < core_module_index; ++index)
            {
                h::Module const* const core_module = sorted_core_modules[index];

                if (alias.module_name == core_module->name)
                {
                    if (dirty_diagnostics[index])
                        return true;
                }
            }
        }

        return false;
    }

    static std::size_t find_sorted_index(
        std::span<h::Module const* const> const sorted_modules,
        std::span<h::Module const> const unsorted_modules,
        std::size_t const unsorted_index
    )
    {
        h::Module const* const module_to_find = &unsorted_modules[unsorted_index];

        auto const location = std::find_if(
            sorted_modules.begin(),
            sorted_modules.end(),
            [&](h::Module const* const sorted_module) -> bool { return sorted_module == module_to_find; }
        );

        return std::distance(sorted_modules.begin(), location);
    }

    static std::pmr::string generate_new_result_id(
        std::string_view const previous_result_id
    )
    {
        char* end = nullptr;
        unsigned long long value = std::strtoull(previous_result_id.data(), &end, 10);
        value += 1;
        return std::pmr::string{std::to_string(value)};
    }

    std::pmr::vector<lsp::WorkspaceDocumentDiagnosticReport> create_all_diagnostics(
        std::span<std::filesystem::path const> const core_module_source_file_paths,
        std::span<std::optional<int> const> const core_module_versions,
        std::span<lsp::PreviousResultId const> const previous_result_ids,
        std::span<std::pmr::string> const core_module_diagnostic_result_ids,
        std::pmr::vector<bool>& core_module_diagnostic_dirty_flags,
        std::span<h::parser::Parse_tree const> const core_module_parse_trees,
        std::span<h::Module const> const header_modules,
        std::span<h::Module> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<lsp::WorkspaceDocumentDiagnosticReport> items{output_allocator};
        items.reserve(core_module_source_file_paths.size());

        std::pmr::vector<h::Module const*> sorted_core_modules = h::compiler::sort_core_modules(
            core_modules,
            temporaries_allocator,
            temporaries_allocator
        );

        h::Declaration_database declaration_database = h::compiler::create_declaration_database_and_add_modules(
            header_modules,
            sorted_core_modules
        );

        for (std::size_t unsorted_index = 0; unsorted_index < core_module_source_file_paths.size(); ++unsorted_index)
        {
            std::size_t const core_module_index = find_sorted_index(
                sorted_core_modules,
                core_modules,
                unsorted_index
            );

            std::filesystem::path const& source_file_path = core_module_source_file_paths[core_module_index];
            std::optional<int> const version = core_module_versions[core_module_index];

            bool const are_diagnostics_dirty = core_module_diagnostic_dirty_flags[core_module_index] ||
                is_any_dependency_dirty(
                    core_module_diagnostic_dirty_flags,
                    sorted_core_modules,
                    core_modules[core_module_index],
                    core_module_index
                );
            if (!are_diagnostics_dirty)
            {
                lsp::DocumentUri const document_uri = lsp::DocumentUri::fromPath(source_file_path.generic_string());

                std::optional<lsp::PreviousResultId> const previous_result_id = find_previous_result_id(
                    previous_result_ids,
                    document_uri
                );

                if (previous_result_id.has_value())
                {
                    std::string_view const current_result_id_value = core_module_diagnostic_result_ids[core_module_index];

                    if (previous_result_id->value == current_result_id_value)
                    {
                        lsp::WorkspaceUnchangedDocumentDiagnosticReport item = create_unchanged_document_diagnostics_report(
                            source_file_path,
                            version,
                            previous_result_id->value
                        );
                        items.push_back(item);

                        continue;
                    }
                }
            }

            core_module_diagnostic_result_ids[core_module_index] = generate_new_result_id(core_module_diagnostic_result_ids[core_module_index]);
            core_module_diagnostic_dirty_flags[core_module_index] = true;

            std::pmr::vector<h::compiler::Diagnostic> const parser_diagnostics = create_parser_diagnostics(
                source_file_path,
                core_module_parse_trees[core_module_index],
                temporaries_allocator,
                temporaries_allocator
            );

            if (!parser_diagnostics.empty())
            {
                lsp::WorkspaceFullDocumentDiagnosticReport item = create_full_document_diagnostics_report(
                    source_file_path,
                    version,
                    core_module_diagnostic_result_ids[core_module_index],
                    parser_diagnostics
                );

                items.push_back(std::move(item));
            }
            else
            {
                h::Module& core_module = core_modules[core_module_index];

                h::compiler::Analysis_options const options
                {
                    .validate = true,
                };

                h::compiler::Analysis_result const result = h::compiler::process_module(
                    core_module,
                    declaration_database,
                    options,
                    temporaries_allocator
                );

                std::span<h::compiler::Diagnostic const> const compiler_diagnostics = result.diagnostics;

                lsp::WorkspaceFullDocumentDiagnosticReport item = create_full_document_diagnostics_report(
                    source_file_path,
                    version,
                    core_module_diagnostic_result_ids[core_module_index],
                    compiler_diagnostics
                );

                items.push_back(std::move(item));
            }
        }

        return items;
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

    lsp::String diagnostic_source_to_string(
        h::compiler::Diagnostic_source const source
    )
    {
        switch (source)
        {
            case h::compiler::Diagnostic_source::Parser:
                return "Parser";
            case h::compiler::Diagnostic_source::Compiler:
            default:
                return "Compiler";
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
            .source = diagnostic_source_to_string(input.source),
        };
    }
}
