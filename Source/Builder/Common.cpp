module;

#include <cstdio>
#include <string>

module h.builder.common;

namespace h::builder
{
    void print_message_and_exit(std::string const& message)
    {
        std::puts(message.c_str());
        std::exit(-1);
    }
}
