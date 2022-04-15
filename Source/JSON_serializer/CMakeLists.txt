add_library(H_JSON_serializer)
add_library(H::JSON_serializer ALIAS H_JSON_serializer)

target_compile_features(H_JSON_serializer PUBLIC cxx_std_23)

target_link_libraries(H_JSON_serializer PUBLIC H::Core)

find_package(RapidJSON CONFIG REQUIRED)
target_link_libraries(H_JSON_serializer PRIVATE rapidjson)

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
