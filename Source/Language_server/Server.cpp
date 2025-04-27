module;

#include <cstdio>

module h.language_server.server;

namespace h::language_server
{
    static constexpr bool g_debug = true;

    Server create_server()
    {
        return {};
    }

    Initialize_result initialize(
        Server& server,
        Initialize_params const& parameters
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server initialize\n");

        return {};
    }

    void initialized(
        Server& server
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server initialized\n");
    }

    Shutdown_result shutdown(
        Server& server
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server shutdown\n");

        return {};
    }
    
    void exit(
        Server& server
    )
    {
        if constexpr (g_debug)
            std::printf("Language Server exit\n");
    }
}
