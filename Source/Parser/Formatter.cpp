module;

#include <memory_resource>
#include <sstream>
#include <string>
#include <string_view>

module h.parser.formatter;

import h.core;

namespace h::parser
{
    struct String_buffer
    {
        std::stringstream string_stream;
    };

    static std::pmr::string to_string(String_buffer const& buffer)
    {
        return std::pmr::string{buffer.string_stream.str()};
    }

    static void add_text(
        String_buffer& buffer,
        std::string_view const text
    )
    {
        buffer.string_stream << text;
    }

    static void add_new_line(
        String_buffer& buffer
    )
    {
        add_text(buffer, "\n");
    }

    static void add_comment(
        String_buffer& buffer,
        std::string_view const comment
    )
    {
        // TODO
    }


    static void add_format_declaration(
        String_buffer& buffer,
        Declaration const& declaration,
        Format_options const& options
    )
    {
        // TODO
    }

    static void add_format_import_module_with_alias(
        String_buffer& buffer,
        Import_module_with_alias const& alias_import,
        Format_options const& options
    )
    {
        add_text(buffer, "import ");
        add_text(buffer, alias_import.module_name);
        add_text(buffer, " as ");
        add_text(buffer, alias_import.alias);
        add_text(buffer, ";");
    }

    std::pmr::string format_module(
        h::Module const& core_module,
        Format_options const& options
    )
    {
        String_buffer buffer;

        if (core_module.comment.has_value())
        {
            add_comment(buffer, core_module.comment.value());
        }

        add_text(buffer, "module ");
        add_text(buffer, core_module.name);
        add_text(buffer, ";");
        add_new_line(buffer);

        if (core_module.dependencies.alias_imports.size() > 0)
            add_new_line(buffer);

        for (Import_module_with_alias const& alias_import : core_module.dependencies.alias_imports)
        {
            add_format_import_module_with_alias(buffer, alias_import, options);
            add_new_line(buffer);
        }

        std::pmr::vector<h::Declaration> declarations; // TODO
        
        if (declarations.size() > 0)
            add_new_line(buffer);

        for (h::Declaration const& declaration : declarations)
        {
            add_format_declaration(buffer, declaration);
            add_new_line(buffer);
        }

        return to_string(buffer);
    }
}
