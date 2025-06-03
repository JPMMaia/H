module;

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
        Source_range range = {};
        Diagnostic_source source = {};
        Diagnostic_severity severity = {};
        std::pmr::string message = {};
        Diagnostic_related_information related_information = {};

        friend auto operator<=>(Diagnostic const& lhs, Diagnostic const& rhs) = default;
    };
}
