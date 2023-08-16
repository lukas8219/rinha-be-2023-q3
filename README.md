# Rinha BE 2023 - Q3 @luucaspole/@lukas8219

### Tecnologias usadas:

- Node + Express
- Redis
- Postgres


### WIP - Almost Done
100% success:
- TBD adicionar screenshot


### Tática
- Confiar no eventloop 🙏🏻
- Cache no Get by Id e pós POST
- SET para apelidos usados
- Cache na validaçao do POST. Caso exista
- Cache 5 segundos na busca por termo

Tabela
Id, apelido, nome, stack(Como JSON)

- Cliente se responsabiliza pela consistencia do array na stack

Index de FTS, individual em cada campo.