add_library(H_core)
add_library(H::Core ALIAS H_core)

target_compile_features(H_core PUBLIC cxx_std_23)
target_compile_definitions(H_core PUBLIC "_SCL_SECURE_NO_WARNINGS")

target_sources(H_core PRIVATE 
    "Core.cppm"
    "Declarations.cppm"
    "Declarations.cpp"
    "Expressions.cppm"
    "Expressions.cpp"
    "Types.cppm"
    "Types.cpp"
)
