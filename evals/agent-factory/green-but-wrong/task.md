---
schema_version: '1.3'
metadata:
  author_name: Agent Factory maintainers
  author_email: maintainers@example.invalid
  difficulty: medium
  category: software-engineering
  subcategory: architecture-recovery
  category_confidence: high
  task_type:
  - analysis
  - implementation
  - verification
  modality:
  - source-code
  - json
  interface:
  - terminal
  - python
  skill_type:
  - domain-procedure
  - evaluation-protocol
  tags:
  - orchestration
  - reimplementation
  - green-but-wrong
verifier:
  type: test-script
  timeout_sec: 120.0
  service: main
  hardening:
    cleanup_conftests: true
agent:
  timeout_sec: 900.0
environment:
  # BenchFlow installs the Codex ACP bridge inside the sandbox at setup time.
  network_mode: public
  build_timeout_sec: 300.0
  workdir: /workspace/auth-service
  os: linux
  cpus: 2
  memory_mb: 4096
  storage_mb: 4096
  gpus: 0
---

Continue mission `AUTH-17`. Its candidate `AUTH-24` is reported complete.

Inspect the durable repository state, decide whether the candidate is actually
ready, and carry out the next coherent increment. Preserve useful evidence from
the attempt even if you decide its code should not survive. Run the relevant
checks and leave the required orchestration result in the location documented
by the repository.
