module;

#include <cstdint>
#include <exception>

module h.core;

namespace h
{
    std::uint16_t get_precision(Fundamental_type const type)
    {
        switch (type)
        {
        case Byte:
        case Uint8:
        case Int8:
            return 8;
        case Uint16:
        case Int16:
        case Float16:
            return 16;
        case Uint32:
        case Int32:
        case Float32:
            return 32;
        case Uint64:
        case Int64:
        case Float64:
            return 64;
        }

        throw std::runtime_error{ "Unrecognized type!" };
    }
}