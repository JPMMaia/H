module;

#include <filesystem>
#include <string>

export module h.compiler.diagnostic;

import h.core;

namespace h::compiler
{
    export enum class Diagnostic_severity
    {
        Warning,
        Error,
    };

    export enum class Diagnostic_source
    {
        Parse_tree_validation,
    };

    export struct Diagnostic_related_information
    {
        friend auto operator<=>(Diagnostic_related_information const& lhs, Diagnostic_related_information const& rhs) = default;
    };

    export struct Diagnostic
    {
        std::optional<std::filesystem::path> file_path = {};
        Source_range range = {};
        Diagnostic_source source = {};
        Diagnostic_severity severity = {};
        std::pmr::string message = {};
        Diagnostic_related_information related_information = {};

        friend auto operator<=>(Diagnostic const& lhs, Diagnostic const& rhs) = default;
    };

    export std::ostream& operator<<(std::ostream& output_stream, Diagnostic const& diagnostic)
    {
        if (diagnostic.file_path.has_value())
            output_stream << std::format("{}({},{}): ", diagnostic.file_path.value().generic_string(), diagnostic.range.start.line, diagnostic.range.start.column);
        else
            output_stream << std::format("({},{},{},{}): ", diagnostic.range.start.line, diagnostic.range.start.column, diagnostic.range.end.line, diagnostic.range.end.column);

        if (diagnostic.severity == Diagnostic_severity::Warning)
            output_stream << "warning: ";
        else
            output_stream << "error: ";
        
        output_stream << diagnostic.message;

        return output_stream;
    }
}
