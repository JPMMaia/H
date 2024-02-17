add_custom_command(
    OUTPUT "${CMAKE_CURRENT_LIST_DIR}/hl/hello_world.hl"
    COMMAND "${CMAKE_COMMAND}"
    ARGS
        "-E" "env" "NODE_PATH=${CMAKE_BINARY_DIR}/Source/Parser/node_modules"
        "node"
        "${CMAKE_BINARY_DIR}/Source/Parser/application/Application.js"
        "write" "${CMAKE_CURRENT_LIST_DIR}/hl/hello_world.hl"
        "--input" "${CMAKE_CURRENT_LIST_DIR}/txt/hello_world.hltxt"
    VERBATIM
    COMMENT "Generating Examples/hl/hello_world.hl"
    DEPENDS Parser "${CMAKE_CURRENT_LIST_DIR}/txt/hello_world.hltxt"
)
add_custom_target(Generate_examples DEPENDS "${CMAKE_CURRENT_LIST_DIR}/hl/hello_world.hl")
