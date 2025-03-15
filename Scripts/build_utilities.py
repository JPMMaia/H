import subprocess
import os
from pathlib import Path
import shutil
import argparse

def run_command(directory: str, command: str) -> None:
    """Run a shell command in a specific directory."""
    try:
        result: subprocess.CompletedProcess = subprocess.run(
            command, shell=True, cwd=directory, capture_output=True, text=True
        )
        print(f"Command: {command} (in {directory})")
        print("Output:\n", result.stdout)
        if result.stderr:
            print("Error:\n", result.stderr)
    except Exception as e:
        print(f"Failed to run command in {directory}: {e}")


def copy_folder(source: str, destination: str) -> None:
    """Copy an entire folder from source to destination."""
    try:
        shutil.copytree(source, destination, dirs_exist_ok=True)
        print(f"Copied folder from {source} to {destination}")
    except Exception as error:
        print(f"Failed to copy folder: {error}")

def copy_file(source: str, destination: str) -> None:
    """Copy a single file from source to destination."""
    try:
        shutil.copy2(source, destination)  # Preserves metadata
        print(f"Copied file from {source} to {destination}")
    except Exception as error:
        print(f"Failed to copy file: {error}")

root_directory = Path(__file__).resolve().parent.parent
examples_directory = root_directory.joinpath("Examples")
extension_directory = root_directory.joinpath("Tools/vscode/H-editor")
parser_directory = root_directory.joinpath("Source/Parser/tree-sitter-hlang")
parser_app_file_path = extension_directory.joinpath("dist/parser.js")
core_package_directory = extension_directory.joinpath("packages/core")

def build_parser() -> None:
    run_command(parser_directory.as_posix(), "npm run generate")
    run_command(parser_directory.as_posix(), "npm run prebuild")
    run_command(parser_directory.as_posix(), "npm pack")
    run_command(core_package_directory.as_posix(), "npm install " + parser_directory.joinpath("tree-sitter-hlang-0.1.0.tgz").as_posix())
    run_command(extension_directory.as_posix(), "npm run webpack:parser")

def copy_parser(destination_directory: Path) -> None:
    copy_file(parser_app_file_path, destination_directory)

    dependencies = [
        "node-gyp-build",
        "tree-sitter",
        "tree-sitter-hlang"
    ]
    
    for dependency in dependencies:
        source_directory = extension_directory.joinpath("node_modules").joinpath(dependency)
        destination_dependency_directory = destination_directory.joinpath("node_modules").joinpath(dependency)
        copy_folder(source_directory, destination_dependency_directory)

def parse_file(directory: Path, source: Path, destination: Path) -> None:
    run_command(directory.as_posix(), "node " + parser_app_file_path.as_posix() + " write " + destination.as_posix() + " --input " + source.as_posix())

def generate_builtin() -> None:
    builtin_directory = root_directory.joinpath("Source/Compiler/Builtin")
    source_file = builtin_directory.joinpath("builtin.hltxt")
    destination_file = builtin_directory.joinpath("builtin.hl")
    parse_file(builtin_directory, source_file, destination_file)

def generate_examples() -> None:
    text_directory = examples_directory.joinpath("txt")
    source_files = list(text_directory.glob(f"*.hltxt"))

    for source_file in source_files:
        destination_file = examples_directory.joinpath("hl").joinpath(source_file.stem + ".hl")
        parse_file(examples_directory, source_file, destination_file)
        
# Execute commands
def main() -> None:

    parser = argparse.ArgumentParser(description="Helper scripts for building Hlang.")
    subparsers = parser.add_subparsers(dest="command", required=True, help="Available commands")

    build_parser_command = subparsers.add_parser("build_parser", help="Build parser")
    
    copy_parser_command = subparsers.add_parser("copy_parser", help="Copy parser")
    copy_parser_command.add_argument("destination_directory")

    generate_builtin_command = subparsers.add_parser("generate_builtin", help="Generate builtin")
    
    generate_examples_command = subparsers.add_parser("generate_examples", help="Generate examples")

    args = parser.parse_args()

    if args.command == "build_parser":
        build_parser()
    elif args.command == "copy_parser":
        copy_parser(Path(args.destination_directory))
    elif args.command == "generate_builtin":
        generate_builtin()
    elif args.command == "generate_examples":
        generate_examples()


if __name__ == "__main__":
    main()
