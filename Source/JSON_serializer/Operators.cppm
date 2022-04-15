module;

#include <istream>
#include <optional>
#include <ostream>

#include <rapidjson/istreamwrapper.h>
#include <rapidjson/ostreamwrapper.h>
#include <rapidjson/reader.h>
#include <rapidjson/writer.h>

export module h.json_serializer.operators;

import h.core;
import h.json_serializer;

namespace h::json::operators
{
    export std::istream& operator>>(std::istream& input_stream, h::Variable_expression_type& value)
    {
        std::pmr::string string;
        input_stream >> string;

        value = h::json::read_enum<h::Variable_expression_type>(string);

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Variable_expression_type const value)
    {
        output_stream << h::json::write_enum(value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Binary_operation& value)
    {
        std::pmr::string string;
        input_stream >> string;

        value = h::json::read_enum<h::Binary_operation>(string);

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Binary_operation const value)
    {
        output_stream << h::json::write_enum(value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Linkage& value)
    {
        std::pmr::string string;
        input_stream >> string;

        value = h::json::read_enum<h::Linkage>(string);

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Linkage const value)
    {
        output_stream << h::json::write_enum(value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Integer_type& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Integer_type> const output = h::json::read<h::Integer_type>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Integer_type const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Float_type& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Float_type> const output = h::json::read<h::Float_type>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Float_type const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Type& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Type> const output = h::json::read<h::Type>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Type const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Variable_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Variable_expression> const output = h::json::read<h::Variable_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Variable_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Binary_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Binary_expression> const output = h::json::read<h::Binary_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Binary_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Call_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Call_expression> const output = h::json::read<h::Call_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Call_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Integer_constant& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Integer_constant> const output = h::json::read<h::Integer_constant>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Integer_constant const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Half_constant& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Half_constant> const output = h::json::read<h::Half_constant>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Half_constant const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Float_constant& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Float_constant> const output = h::json::read<h::Float_constant>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Float_constant const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Double_constant& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Double_constant> const output = h::json::read<h::Double_constant>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Double_constant const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Constant_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Constant_expression> const output = h::json::read<h::Constant_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Constant_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Return_expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Return_expression> const output = h::json::read<h::Return_expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Return_expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Expression& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Expression> const output = h::json::read<h::Expression>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Expression const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Statement& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Statement> const output = h::json::read<h::Statement>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Statement const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Function_declaration& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Function_declaration> const output = h::json::read<h::Function_declaration>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Function_declaration const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Function_definition& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Function_definition> const output = h::json::read<h::Function_definition>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Function_definition const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Language_version& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Language_version> const output = h::json::read<h::Language_version>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Language_version const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Module_declarations& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Module_declarations> const output = h::json::read<h::Module_declarations>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Module_declarations const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Module_definitions& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Module_definitions> const output = h::json::read<h::Module_definitions>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Module_definitions const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

    export std::istream& operator>>(std::istream& input_stream, h::Module& value)
    {
        rapidjson::Reader reader;
        rapidjson::IStreamWrapper stream_wrapper{ input_stream };
        std::optional<h::Module> const output = h::json::read<h::Module>(reader, stream_wrapper);

        if (output)
        {
            value = std::move(*output);
        }

        return input_stream;
    }

    export std::ostream& operator<<(std::ostream& output_stream, h::Module const& value)
    {
        rapidjson::OStreamWrapper stream_wrapper{ output_stream };
        rapidjson::Writer<rapidjson::OStreamWrapper> writer{ stream_wrapper };
        h::json::write(writer, value);

        return output_stream;
    }

}
