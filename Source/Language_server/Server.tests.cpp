#include <cstdio>
#include <optional>

#include <catch2/catch_all.hpp>

import h.language_server.core;
import h.language_server.server;

namespace h::language_server
{
    TEST_CASE("Initialize and exit", "[Server]")
    {
        Server server = create_server();

        Initialize_params const initialize_parameters
        {
            .process_id = 1,
            .workspace_folders = {}
        };

        Initialize_result const initialize_result = initialize(server, initialize_parameters);
        // TODO check

        initialized(server);

        Shutdown_result shutdown_result = shutdown(server);

        exit(server);
    }
}
