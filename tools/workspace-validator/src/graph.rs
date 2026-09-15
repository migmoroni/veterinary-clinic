use std::collections::{BTreeMap, BTreeSet};

pub fn validate_graph(
    ids: &BTreeSet<String>,
    dependencies: &BTreeMap<String, Vec<String>>,
    label: &str,
) -> Result<(), String> {
    for (id, required) in dependencies {
        for dependency in required {
            if !ids.contains(dependency) {
                return Err(format!(
                    "{label} {id} references missing dependency {dependency}"
                ));
            }
        }
    }
    fn visit(
        id: &str,
        dependencies: &BTreeMap<String, Vec<String>>,
        visiting: &mut BTreeSet<String>,
        visited: &mut BTreeSet<String>,
        label: &str,
    ) -> Result<(), String> {
        if visited.contains(id) {
            return Ok(());
        }
        if !visiting.insert(id.to_string()) {
            return Err(format!("cycle in {label} graph at {id}"));
        }
        for dependency in dependencies.get(id).into_iter().flatten() {
            visit(dependency, dependencies, visiting, visited, label)?;
        }
        visiting.remove(id);
        visited.insert(id.to_string());
        Ok(())
    }
    let mut visiting = BTreeSet::new();
    let mut visited = BTreeSet::new();
    for id in ids {
        visit(id, dependencies, &mut visiting, &mut visited, label)?;
    }
    Ok(())
}

pub fn dependency_order(target: &str, dependencies: &BTreeMap<String, Vec<String>>) -> Vec<String> {
    fn add(
        id: &str,
        dependencies: &BTreeMap<String, Vec<String>>,
        seen: &mut BTreeSet<String>,
        result: &mut Vec<String>,
    ) {
        if !seen.insert(id.to_string()) {
            return;
        }
        for dependency in dependencies.get(id).into_iter().flatten() {
            add(dependency, dependencies, seen, result);
        }
        result.push(id.to_string());
    }
    let mut result = Vec::new();
    add(target, dependencies, &mut BTreeSet::new(), &mut result);
    result
}
