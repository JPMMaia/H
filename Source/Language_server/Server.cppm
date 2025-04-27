module;

export module h.language_server.server;

import h.language_server.core;
import h.language_server.message;

namespace h::language_server
{
    export struct Server
    {

    };

    export Server create_server();

    export Initialize_result initialize(
        Server& server,
        Initialize_params const& parameters
    );

    export void initialized(
        Server& server
    );

    export Shutdown_result shutdown(
        Server& server
    );

    export void exit(
        Server& server
    );
}
