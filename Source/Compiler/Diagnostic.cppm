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
        Information,
        Hint,
    };

    export enum class Diagnostic_source
    {
        Parser,
        Compiler
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

    export std::pmr::string diagnostic_to_string(
        Diagnostic const& diagnostic,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export std::ostream& operator<<(
        std::ostream& output_stream,
        Diagnostic const& diagnostic
    );
}
