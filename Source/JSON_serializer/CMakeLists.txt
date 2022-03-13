add_library(H_JSON_serializer)

target_compile_features(H_JSON_serializer PRIVATE cxx_std_23)

target_link_libraries(H_JSON_serializer PUBLIC H::Core)

find_package(nlohmann_json REQUIRED)
target_link_libraries(H_JSON_serializer PUBLIC nlohmann_json::nlohmann_json)

target_sources(H_JSON_serializer PRIVATE
    "JSON_serializer.cppm"
    "JSON_serializer.cpp"
)
