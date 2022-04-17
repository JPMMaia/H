add_library(H_core)
add_library(H::Core ALIAS H_core)

target_compile_features(H_core PUBLIC cxx_std_23)

target_sources(H_core PRIVATE "Core.cppm")
