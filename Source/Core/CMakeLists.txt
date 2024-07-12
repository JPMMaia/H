add_library(H_core)
add_library(H::Core ALIAS H_core)

target_compile_features(H_core PUBLIC cxx_std_23)
target_compile_definitions(H_core PUBLIC "_SCL_SECURE_NO_WARNINGS")

target_link_libraries(H_core PRIVATE H::Common)

target_sources(H_core PRIVATE 
    "Core.cppm"
    "Core.cpp"
    "Declarations.cppm"
    "Declarations.cpp"
    "Expressions.cppm"
    "Expressions.cpp"
    "Struct_layout.cppm"
    "Types.cppm"
    "Types.cpp"
)
