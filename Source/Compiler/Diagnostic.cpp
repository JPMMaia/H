module;

#include <filesystem>
#include <format>
#include <memory_resource>
#include <sstream>
#include <string>

module h.compiler.diagnostic;

import h.core;

namespace h::compiler
{
    std::pmr::string diagnostic_to_string(
        Diagnostic const& diagnostic,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        using String_stream = std::basic_stringstream<char, std::char_traits<char>, std::pmr::polymorphic_allocator<char>>;

        String_stream output_stream{std::ios_base::in | std::ios_base::out, temporaries_allocator};

        output_stream << diagnostic;

        return std::pmr::string{output_stream.str(), output_allocator};
    }

    std::ostream& operator<<(std::ostream& output_stream, Diagnostic const& diagnostic)
    {
        if (diagnostic.file_path.has_value())
            output_stream << std::format("{}:{}:{}: ", diagnostic.file_path.value().generic_string(), diagnostic.range.start.line, diagnostic.range.start.column);
        else
            output_stream << std::format("({},{},{},{}): ", diagnostic.range.start.line, diagnostic.range.start.column, diagnostic.range.end.line, diagnostic.range.end.column);

        if (diagnostic.severity == Diagnostic_severity::Warning)
            output_stream << "warning: ";
        else
            output_stream << "error: ";
        
        output_stream << diagnostic.message;

        return output_stream;
    }

    void sort_diagnostics(
        std::pmr::vector<Diagnostic>& diagnostics
    )
    {
        std::sort(
            diagnostics.begin(),
            diagnostics.end(),
            [](Diagnostic const& lhs, Diagnostic const& rhs)
            {
                if (lhs.file_path != rhs.file_path)
                    return lhs.file_path < rhs.file_path;

                if (lhs.range.start.line != rhs.range.start.line)
                    return lhs.range.start.line < rhs.range.start.line;

                if (lhs.range.start.column != rhs.range.start.column)
                    return lhs.range.start.column < rhs.range.start.column;

                return lhs.message < rhs.message;
            }
        );
    }
}
