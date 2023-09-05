# Rinha BE 2023 - Q3 @luucaspole/@lukas8219

### Tecnologias usadas:

- Node + Express
- Postgres

### WIP - Almost Done
100% success:
- TBD adicionar screenshot


### Tática
- Confiar no eventloop 🙏🏻

Tabela
Id, apelido, nome, stack(Como JSON)

- Cliente se responsabiliza pela consistencia do array na stack

Index de FTS, individual em cada campo.

### UPGRADE (akita)

- cache não é necessário: o tempo pra usar o cache é o mesmo que pra usar o banco, é muito pouco dado pra fazer diferença
- devolver head/status, não precisa renderizar json de erro o tempo todo
- expor configuração de pool e aumentar
- o banco não consome tanto quanto se pensa, pode dar menos recurso pra ele. precisa que a app segure mais conexões
