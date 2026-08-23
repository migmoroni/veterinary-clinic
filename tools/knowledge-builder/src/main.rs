fn main() {
    if let Err(error) = knowledge_builder::cli::run(std::env::args_os()) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
