add_library(H_language_server)
add_library(H::Language_server ALIAS H_language_server)

set_target_properties(H_language_server PROPERTIES OUTPUT_NAME "H_language_server_lib")

target_compile_features(H_language_server PUBLIC cxx_std_23)

target_link_libraries(H_language_server PUBLIC H::Common H::Compiler)

target_link_libraries(H_language_server PRIVATE lsp)

find_package(argparse CONFIG REQUIRED)
target_link_libraries(H_language_server PRIVATE argparse::argparse)

find_package(nlohmann_json CONFIG REQUIRED)
target_link_libraries(H_language_server PRIVATE nlohmann_json::nlohmann_json)

target_sources(H_language_server
   PUBLIC FILE_SET modules TYPE CXX_MODULES
        FILES
            "Breakpoint.cppm"
            "Core.cppm"
            "Completion.cppm"
            "Diagnostics.cppm"
            "Inlay_hints.cppm"
            "Message_handler.cppm"
            "Server.cppm"
   PRIVATE
      "Core.cpp"
      "Completion.cpp"
      "Diagnostics.cpp"
      "Inlay_hints.cpp"
      "Message_handler.cpp"
      "Server.cpp"
)


add_executable(H_language_server_app)
add_executable(H::Language_server_app ALIAS H_language_server_app)

target_link_libraries(H_language_server_app PRIVATE H_language_server)

set_target_properties(H_language_server_app PROPERTIES OUTPUT_NAME "hlang_language_server")

target_sources(H_language_server_app
   PRIVATE
      "main.cpp"
)

install(TARGETS H_language_server_app)


#[[
if(BUILD_TESTING)
   add_executable(H_language_server_tests)
   target_link_libraries(H_language_server_tests PRIVATE H_language_server)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_language_server_tests PRIVATE Catch2::Catch2 Catch2::Catch2WithMain)

   target_sources(H_language_server_tests PRIVATE
   )

   include(Catch)
   catch_discover_tests(H_language_server_tests)
endif()
#]]
