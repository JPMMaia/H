module;

#include <cstdint>
#include <format>
#include <ostream>
#include <vector>

export module h.core.struct_layout;

namespace h
{
    export struct Struct_member_layout
    {
        std::uint64_t offset = 0;
        std::uint64_t size = 0;
        std::uint64_t alignment = 0;

        friend auto operator<=>(Struct_member_layout const&, Struct_member_layout const&) = default;
    };

    export std::ostream& operator<<(std::ostream& output_stream, Struct_member_layout const& value)
    {
        output_stream << std::format("{{\"offset\": {}, \"size\": {}, \"alignment\": {}}}", value.offset, value.size, value.alignment);

        return output_stream;
    }

    export struct Struct_layout
    {
        std::uint64_t size = 0;
        std::uint64_t alignment = 0;
        std::pmr::vector<Struct_member_layout> members;

        friend auto operator<=>(Struct_layout const&, Struct_layout const&) = default;
    };

    export std::ostream& operator<<(std::ostream& output_stream, Struct_layout const& value)
    {
        output_stream << "{\n";
        output_stream << "    \"size\": " << value.size << "\n";
        output_stream << "    \"alignment\": " << value.alignment << "\n";
        output_stream << "    \"members\": [\n";

        for (std::size_t index = 0; index < value.members.size(); ++index)
        {
            Struct_member_layout const& member = value.members[index];
            output_stream << "        ";
            output_stream << member;
            if (index + 1 < value.members.size())
                output_stream << ',';
            output_stream << '\n';
        }

        output_stream << "    ]\n";
        output_stream << "}";

        return output_stream;
    }
}
