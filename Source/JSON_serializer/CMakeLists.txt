add_library(H_JSON_serializer)
add_library(H::JSON_serializer ALIAS H_JSON_serializer)

target_compile_features(H_JSON_serializer PUBLIC cxx_std_23)

target_link_libraries(H_JSON_serializer PUBLIC H::Core)

find_package(RapidJSON CONFIG REQUIRED)
target_link_libraries(H_JSON_serializer PUBLIC rapidjson)

target_sources(H_JSON_serializer PRIVATE
    "JSON_serializer.cppm"
    "Operators.cppm"
    "Read_handler.cppm"
    "Read_json.cppm"
    "Write_json.cppm"
)


if(BUILD_TESTING)
   add_executable(H_JSON_serializer_tests)
   target_link_libraries(H_JSON_serializer_tests PRIVATE H_JSON_serializer)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_JSON_serializer_tests PRIVATE Catch2::Catch2)

   target_sources(H_JSON_serializer_tests PRIVATE "JSON_serializer.tests.cpp")

   include(Catch)
   catch_discover_tests(H_JSON_serializer_tests)
endif()


set(H_ROOT_DIR "${CMAKE_CURRENT_LIST_DIR}/../../")

add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Source/JSON_serializer/Read_json.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "read"
                "h.json_serializer.read_json"
                "h::json"
                "h.core"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Source/JSON_serializer/Read_json.cppm"
    DEPENDS H_Tools_Generate_JSON "${H_ROOT_DIR}/Source/Core/Core.cppm"
    VERBATIM
)
add_custom_target(Generate_json_serializer_read_code DEPENDS "${H_ROOT_DIR}/Source/JSON_serializer/Read_json.cppm")


add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Source/JSON_serializer/Write_json.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "write"
                "h.json_serializer.write_json"
                "h::json"
                "h.core"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Source/JSON_serializer/Write_json.cppm"
    DEPENDS H_Tools_Generate_JSON "${H_ROOT_DIR}/Source/Core/Core.cppm"
    VERBATIM
)
add_custom_target(Generate_json_serializer_write_code DEPENDS "${H_ROOT_DIR}/Source/JSON_serializer/Write_json.cppm")


add_custom_command(
    OUTPUT "${H_ROOT_DIR}/Source/JSON_serializer/Operators.cppm"
    COMMAND H_Tools_Generate_JSON
                ARGS
                "operators"
                "h.json_serializer.operators"
                "h::json::operators"
                "h.core"
                "${H_ROOT_DIR}/Source/Core/Core.cppm"
                "${H_ROOT_DIR}/Source/JSON_serializer/Operators.cppm"
    DEPENDS H_Tools_Generate_JSON "${H_ROOT_DIR}/Source/Core/Core.cppm"
    VERBATIM
)
add_custom_target(Generate_json_serializer_operators_code DEPENDS "${H_ROOT_DIR}/Source/JSON_serializer/Operators.cppm")

add_custom_target(Generate_json_serializer_code DEPENDS Generate_json_serializer_read_code Generate_json_serializer_write_code Generate_json_serializer_operators_code)
