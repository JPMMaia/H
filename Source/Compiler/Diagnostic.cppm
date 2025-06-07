module;

#include <string>

export module h.compiler.diagnostic;

import h.core;

namespace h::compiler
{
    export struct Diagnostic_severity
    {
        Warning,
        Error,
    };

    export struct Diagnostic
    {
        Source_range range = {};
        Diagnostic_severity severity = {};
        std::pmr::string message = {};

        friend auto operator<=>(Diagnostic const& lhs, Diagnostic const& rhs) = default;
    };
}
