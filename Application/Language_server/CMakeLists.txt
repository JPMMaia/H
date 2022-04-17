add_executable(H_Language_server)

target_link_libraries(H_Language_server PRIVATE
    H::Core
    H::Editor
    H::JSON_serializer
)

target_sources(H_Language_server PRIVATE
    "main.cpp"
    "Request.cppm"
    "Read_json_request.cppm"
    "Read_handler.cppm"
    "Write_json_request.cppm"
    "JSON_serializer.cppm"
)


set(H_ROOT_DIR "${CMAKE_CURRENT_LIST_DIR}/../../")

add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Application/Language_server/Read_json_request.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "read"
                "h.language_server.read_json_request"
                "h::language_server"
                "h.language_server.request"
                "${H_ROOT_DIR}/Application/Language_server/Request.cppm"
                "${H_ROOT_DIR}/Application/Language_server/Read_json_request.cppm"
    DEPENDS H_Tools_Generate_JSON "${H_ROOT_DIR}/Application/Language_server/Request.cppm"
)
add_custom_target(Generate_language_server_read_json_code DEPENDS "${H_ROOT_DIR}/Application/Language_server/Read_json_request.cppm")

add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Application/Language_server/Write_json_request.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "write"
                "h.language_server.write_json_request"
                "h::language_server"
                "h.language_server.request"
                "${H_ROOT_DIR}/Application/Language_server/Request.cppm"
                "${H_ROOT_DIR}/Application/Language_server/Write_json_request.cppm"
    DEPENDS H_Tools_Generate_JSON "${H_ROOT_DIR}/Application/Language_server/Request.cppm"
)
add_custom_target(Generate_language_server_write_json_code DEPENDS "${H_ROOT_DIR}/Application/Language_server/Write_json_request.cppm")
