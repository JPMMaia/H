module;

#include <cstddef>
#include <memory_resource>
#include <optional>
#include <span>
#include <vector>

export module h.binary_serializer;

import h.binary_serializer.generated;
import h.binary_serializer.generics;
import h.core;

namespace h::binary_serializer
{
    export std::optional<std::pmr::vector<std::byte>> serialize_module(
        h::Module const& core_module,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Serializer serializer
        {
            .data{temporaries_allocator}
        };
        serialize(serializer, core_module);

        return std::pmr::vector<std::byte>{std::move(serializer.data), output_allocator};
    }

    export std::optional<h::Module> deserialize_module(
        std::span<std::byte const> const data
    )
    {
        Deserializer deserializer
        {
            .data = data,
            .offset = 0,
        };

        h::Module core_module = {};
        deserialize(deserializer, core_module);

        return core_module;
    }
}
