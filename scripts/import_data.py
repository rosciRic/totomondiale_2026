#!/usr/bin/env python3
"""
Totomondiale 2026 - Data Import Script
Parses raw spreadsheet data (Excel CSV export) and generates
partite.json and pronostici.json databases.
Run once to initialize the database from the Excel data.
"""
import json
import re

# ── 38 Participants in spreadsheet column order ──────────────────────────────
PARTICIPANTS = [
    "Marco D'Andrea", "Andrea Pellè", "Edoardo Roscica", "Leonardo Piras",
    "Marco Lala", "Raffaele Chiffi", "Andrea Quarto", "Marco Boellis",
    "Tony Pindinello", "Carlo Fantasia", "Matteo Birilli", "Gabriele Carrarini",
    "Luigi Marchello", "Filippo Marchello", "Matteo Serafino", "Leandro Micelli",
    "Pino Bruno", "Manuel Farlò", "Simone Turturo", "Mattia Tramacere",
    "Daniele Garzya", "Sergio Garzya", "Daniele Bove", "Marco Pellè",
    "Manuel Pellè", "Mattia Pellè", "Francesco Pastore", "Fabio Baldacci",
    "Stefano De Giorgi", "Jacopo De Giorgi", "Pino De Giorgi", "Luigi Miccoli",
    "Mattia Nicolau", "Giacomo Ingrosso", "Marco Ingrosso", "Daniele Sedile",
    "Andrea Sedile", "Carmine Apollonio",
]

# ── Special predictions (premi finali) per participant ───────────────────────
VINCITORE = [
    "Francia","Portogallo","Portogallo","Francia","Spagna","Spagna","Francia",
    "Brasile","Inghilterra","Spagna","Inghilterra","Francia","Spagna","Argentina",
    "Olanda","Argentina","Francia","Olanda","Brasile","Francia","Spagna","Brasile",
    "Spagna","Brasile","Francia","Francia","Spagna","Spagna","Norvegia","Spagna",
    "Brasile","Francia","Spagna","Spagna","Francia","Brasile","Brasile","Brasile",
]
FINALISTA = [
    "Brasile","Francia","Spagna","Spagna","Inghilterra","Francia","Brasile",
    "Francia","Germania","Francia","Spagna","Spagna","Brasile","Spagna",
    "Portogallo","Spagna","Spagna","Francia","Francia","Brasile","Brasile",
    "Francia","Francia","Argentina","Spagna","Inghilterra","Francia","Brasile",
    "Spagna","Francia","Turchia","Francia","Francia","Francia","Spagna","Spagna",
    "Spagna","Francia",
]
CAPOCANNONIERE = [
    "Mbappe","Mbappe","Haaland","Mbappe","Kane","Kane","Oyarzabal","Mbappe",
    "Kane","Kane","Kane","Mbappe","Mbappe","Messi","Mbappe","Dembele",
    "Mbappe","Mbappe","Kane","Mbappe","Oyarzabal","Mbappe","Haaland","Mbappe",
    "Mbappe","Kane","Kane","Kane","Haaland","Mbappe","Mbappe","Mbappe",
    "Mbappe","Kane","Mbappe","Vinicius","Mbappe","Mbappe",
]
MVP = [
    "Olise","Yamal","Vitinha","Mbappe","Kane","Yamal","Mbappe","Vinicius",
    "Yamal","Kane","Kane","Mbappe","Yamal","Ronaldo","Van Dijk","De Bruyne",
    "Mbappe","Kane","Messi","Mbappe","Vinicius","Vinicius","Yamal","Vinicius",
    "Kane","Olise","Pedri","Yamal","Yamal","Yamal","Lautaro","Vitinha",
    "Williams","Olise","Kane","Olise","Rapinha","Olise",
]
PORTIERE = [
    "Alisson","Maignan","Simon","Maignan","Maignan","Maignan","Simon","Alisson",
    "Martinez","Simon","Joan Garcia","Maignan","Courtois","Martinez","Maignan",
    "Maignan","Maignan","Verbruggen","Maignan","Alisson","Simon","Maignan",
    "Maignan","Martinez","Simon","Maignan","Maignan","Maignan","Neuer","Maignan",
    "Alisson","Alisson","Diogo Costa","Simon","Alisson","Alisson","Alisson","Maignan",
]
GIOVANE = [
    "Yamal","Yamal","Yamal","Yamal","Yamal","Yamal","Yamal","Yamal","Yamal",
    "Doue","Yamal","Yamal","Yamal","Endrick","Yamal","Estevao","Doue","Yamal",
    "Doue","Yamal","Yamal","Yamal","Nusa","Yamal","Yamal","Yamal","Yamal",
    "Yamal","Emery","Yamal","Yamal","Nico Paz","Yamal","Doue","Doue","Yamal",
    "Yamal","Yamal",
]

# ── Raw match data: id;day;date;time;group;home;away;result;pred1...pred38 ───
# Matches 1-20 have real results, 21-72 are not yet played (empty result)
MATCH_DATA = """
1;Gio;11-Giu;21:00;A;Messico;Sudafrica;2-0;3-0;2-0;2-1;2-0;3-0;2-0;2-1;2-0;2-0;2-1;2-0;2-0;2-0;2-0;1-1;1-0;2-1;2-1;3-0;1-0;3-1;2-1;2-1;1-2;2-0;2-1;2-0;2-0;2-1;2-0;2-0;2-1;2-1;2-1;3-0;2-0;1-1;2-1
2;Ven;12-Giu;04:00;A;Corea del Sud;Repubblica Ceca;2-1;1-1;1-2;1-1;1-1;1-1;0-2;0-2;1-1;1-2;1-2;1-1;1-1;1-1;3-2;1-2;1-1;1-1;1-1;1-1;1-1;1-1;1-1;2-2;0-2;1-1;1-1;2-1;1-1;1-1;1-1;1-2;1-1;0-1;1-2;0-2;1-1;1-2;1-1
3;Ven;12-Giu;21:00;B;Canada;Bosnia ed Erzegovina;1-1;2-0;1-0;1-0;1-1;2-1;2-1;1-1;2-1;1-1;1-1;0-0;1-1;2-1;1-3;1-1;0-2;1-1;2-1;2-0;2-1;2-0;1-2;1-2;1-1;2-1;1-0;1-0;1-0;1-1;1-1;1-1;0-0;0-2;1-0;2-0;1-1;0-1;2-0
4;Sab;13-Giu;03:00;D;Stati Uniti;Paraguay;4-1;2-1;2-0;1-0;2-1;2-0;2-1;2-1;1-0;1-1;1-1;2-1;2-1;2-1;1-0;1-0;1-1;2-0;2-0;1-1;1-0;3-0;2-0;2-1;1-1;2-0;2-0;1-1;2-2;1-0;2-1;2-0;2-1;1-1;2-1;1-1;2-0;2-0;1-1
5;Sab;13-Giu;21:00;B;Qatar;Svizzera;1-1;0-2;0-3;0-2;1-2;0-2;0-2;0-3;0-2;0-2;0-2;1-1;0-2;1-3;3-3;1-2;0-2;0-3;0-2;0-2;0-2;1-1;0-2;0-3;1-2;0-2;0-1;0-2;0-2;0-2;0-1;0-1;0-3;1-3;1-2;0-4;1-1;0-2;0-2
6;Dom;14-Giu;00:00;C;Brasile;Marocco;1-1;2-0;2-2;2-1;2-1;2-1;2-1;2-1;2-1;1-1;3-1;2-0;2-1;2-1;5-3;1-1;2-1;3-1;2-1;2-1;2-0;2-0;2-1;2-1;3-1;2-1;1-1;3-1;4-2;3-2;2-2;2-1;3-2;2-2;2-1;2-2;3-1;2-1;4-1
7;Dom;14-Giu;03:00;C;Haiti;Scozia;0-1;0-3;0-3;0-2;1-2;0-3;0-3;0-3;0-2;0-3;0-2;0-3;0-2;0-3;0-3;0-1;0-3;0-2;0-2;0-2;0-2;0-4;0-2;1-4;0-2;0-3;0-2;0-3;0-2;0-2;0-2;0-1;0-2;0-4;0-2;0-2;0-3;0-2;0-2
8;Dom;14-Giu;06:00;D;Australia;Turchia;2-0;1-2;1-2;1-3;1-2;1-2;1-2;1-3;1-1;1-2;1-2;0-1;1-2;1-2;3-1;0-3;1-1;1-2;1-2;0-1;0-2;0-3;1-1;0-3;1-1;0-1;1-2;0-1;1-3;1-2;0-2;1-2;1-2;0-0;1-1;1-2;1-3;0-2;1-3
9;Dom;14-Giu;19:00;E;Germania;Curaçao;7-1;5-0;5-0;4-0;3-0;8-0;4-0;6-0;5-0;10-0;4-0;5-0;3-0;5-0;5-0;1-0;4-0;6-0;4-0;4-0;5-0;2-0;4-0;5-0;3-0;5-0;4-0;4-0;6-0;4-0;5-0;4-0;5-0;4-0;3-0;5-0;6-0;2-0;5-0
10;Dom;14-Giu;22:00;F;Olanda;Giappone;2-2;2-1;3-1;2-1;2-1;2-1;2-0;1-1;2-1;2-1;3-1;1-2;2-1;1-1;3-1;0-1;2-0;2-1;2-1;2-1;2-1;2-2;2-1;3-2;2-1;2-0;2-1;2-1;3-1;2-2;3-1;2-2;2-2;0-1;2-1;2-1;3-1;2-1;2-1
11;Lun;15-Giu;01:00;E;Costa d'Avorio;Ecuador;1-0;1-1;1-1;1-1;1-1;1-1;0-0;1-1;0-0;2-1;1-0;1-2;1-1;1-1;1-0;0-1;1-1;2-2;1-1;2-1;1-2;0-0;1-0;1-1;2-2;1-1;3-1;1-1;3-2;0-0;2-1;2-2;0-0;2-2;1-1;1-2;2-2;1-0;1-1
12;Lun;15-Giu;04:00;F;Svezia;Tunisia;5-1;2-0;2-1;0-0;2-1;1-1;2-1;1-0;1-0;3-1;1-1;3-1;1-0;1-2;2-1;1-1;2-1;2-1;1-0;1-0;1-0;2-0;2-0;2-0;2-0;1-0;1-1;0-1;1-0;3-1;0-0;2-2;3-1;0-1;1-0;0-0;0-0;1-0;1-0
13;Lun;15-Giu;18:00;H;Spagna;Capo Verde;0-0;4-0;6-0;5-0;4-0;5-0;3-0;5-0;3-0;8-0;4-0;5-0;3-0;4-0;5-1;0-0;5-0;5-0;3-0;3-0;4-0;4-0;6-0;5-0;5-0;4-0;4-0;4-0;4-0;4-0;5-0;5-0;5-0;7-0;4-1;4-0;4-0;3-1;5-0
14;Lun;15-Giu;21:00;G;Belgio;Egitto;1-1;3-0;2-1;2-1;2-0;3-0;2-0;2-1;2-1;3-0;3-1;2-0;2-0;2-1;4-1;2-0;2-0;2-1;2-0;2-0;1-0;3-3;0-0;4-2;3-1;3-1;3-1;2-1;3-1;2-1;3-1;2-2;3-0;2-2;2-1;2-1;3-0;2-1;3-1
15;Mar;16-Giu;00:00;H;Arabia Saudita;Uruguay;1-1;0-2;1-2;1-3;0-2;1-3;1-2;0-3;0-2;0-2;1-3;0-1;0-2;1-2;1-2;0-2;0-2;0-2;0-2;0-1;0-1;0-2;0-2;1-3;0-3;0-1;0-2;1-1;2-1;0-2;0-2;0-2;0-1;1-0;0-1;1-3;1-2;0-2;1-2
16;Mar;16-Giu;03:00;G;Iran;Nuova Zelanda;2-2;2-0;2-0;1-0;2-0;1-1;0-0;1-0;0-0;1-0;0-2;1-1;1-0;2-1;3-1;1-1;2-0;1-1;1-0;1-0;2-0;1-0;1-1;2-1;0-0;2-1;0-0;1-0;1-1;1-0;2-2;2-1;1-0;2-0;0-0;1-0;1-0;1-2;0-0
17;Mar;16-Giu;21:00;I;Francia;Senegal;3-1;2-0;2-0;2-1;2-0;2-1;3-0;3-1;2-1;3-0;3-0;4-1;2-0;3-1;3-1;2-0;3-1;2-1;2-1;3-1;2-0;1-2;2-1;2-1;3-1;2-1;2-0;2-0;2-1;4-1;2-0;3-1;3-0;0-1;2-1;3-1;2-1;3-1;4-1
18;Mer;17-Giu;00:00;I;Iraq;Norvegia;1-4;0-3;0-2;0-5;0-2;0-3;0-3;0-3;0-3;0-4;0-3;0-3;0-2;0-2;1-3;0-1;0-1;0-3;0-3;0-3;0-3;0-6;0-2;0-4;0-2;0-3;0-2;0-3;1-4;0-4;1-3;0-2;0-3;0-5;0-1;0-3;1-1;0-2;0-3
19;Mer;17-Giu;03:00;J;Argentina;Algeria;3-0;3-0;2-0;3-0;2-0;2-0;3-1;3-0;3-1;3-0;3-0;1-0;2-0;3-1;5-1;0-1;1-1;3-0;3-1;2-0;2-0;1-1;2-2;3-1;3-0;2-0;2-1;3-0;2-0;4-0;3-1;3-1;4-0;1-1;1-0;4-1;2-1;3-1;4-0
20;Mer;17-Giu;06:00;J;Austria;Giordania;3-1;3-0;3-0;1-0;2-0;4-0;3-0;3-0;2-0;3-0;2-0;2-0;2-0;3-0;3-1;3-0;2-0;2-1;2-0;2-0;2-0;2-0;2-0;2-0;2-0;3-0;1-0;2-0;1-0;2-0;2-1;2-0;4-0;3-0;3-0;2-0;1-1;1-0;2-0
21;Mer;17-Giu;19:00;K;Portogallo;RD Congo;;3-0;3-0;2-0;3-0;4-0;2-0;3-0;3-0;4-0;3-0;5-0;3-0;4-0;1-2;3-1;3-0;3-0;2-0;3-0;2-0;4-0;3-0;3-0;2-1;3-0;3-0;3-0;3-0;3-0;4-0;3-0;5-0;4-0;3-1;4-0;1-1;2-0;4-0
22;Mer;17-Giu;22:00;L;Inghilterra;Croazia;;2-0;2-1;2-2;2-1;2-0;1-1;2-1;2-1;2-0;2-1;1-1;2-1;2-1;1-2;1-0;1-2;2-1;2-1;2-0;2-1;2-1;2-1;3-2;2-1;2-1;3-1;3-1;2-2;3-2;2-3;1-1;1-1;3-1;1-1;2-1;1-1;2-1;2-1
23;Gio;18-Giu;01:00;L;Ghana;Panama;;2-1;0-0;2-1;1-1;1-1;1-1;2-0;1-0;3-0;1-0;2-1;1-0;2-0;3-3;1-0;2-0;2-2;2-0;3-0;0-0;3-0;1-1;3-0;1-1;0-0;1-1;1-0;2-2;1-1;0-0;2-0;1-0;3-0;3-0;2-1;0-0;1-1;2-1
24;Gio;18-Giu;04:00;K;Uzbekistan;Colombia;;0-2;0-2;2-2;1-2;0-3;0-2;0-2;0-2;0-3;0-2;1-2;0-2;0-2;0-3;0-0;0-1;0-2;0-2;1-2;0-2;0-2;1-2;1-3;0-2;0-1;0-2;0-2;1-3;0-2;0-2;0-2;0-2;0-1;0-2;1-3;0-0;0-2;0-3
25;Gio;18-Giu;18:00;A;Repubblica Ceca;Sudafrica;;2-0;1-1;2-0;2-0;1-0;1-1;1-1;1-0;2-0;1-0;2-1;2-0;1-2;1-1;2-2;2-0;2-0;1-1;2-0;1-0;0-1;2-0;3-1;0-1;2-1;2-1;1-1;2-0;1-0;1-1;1-0;2-1;2-0;2-1;2-1;2-1;1-0;1-1
26;Gio;18-Giu;21:00;B;Svizzera;Bosnia ed Erzegovina;;2-1;2-0;1-1;2-0;2-0;2-0;2-0;2-1;1-1;1-1;1-1;2-0;2-0;3-1;2-1;1-2;2-1;2-0;2-0;1-0;1-2;1-1;3-1;1-1;2-1;1-1;2-0;1-0;2-0;2-2;2-1;1-0;1-1;1-1;2-0;0-1;1-0;2-1
27;Ven;19-Giu;00:00;B;Canada;Qatar;;3-0;2-0;2-0;2-0;3-0;3-0;2-0;3-0;2-0;2-0;1-0;2-0;2-1;3-1;2-0;0-0;2-0;2-1;3-0;1-0;3-0;2-0;4-1;2-1;3-1;1-0;2-0;2-1;1-0;1-0;1-0;2-0;0-1;1-0;1-0;4-1;1-0;1-1
28;Ven;19-Giu;03:00;A;Messico;Corea del Sud;;2-1;1-0;1-0;2-1;2-1;2-0;2-0;2-1;1-1;2-1;1-1;1-0;3-1;2-1;1-2;1-1;2-0;2-1;1-1;1-0;4-0;2-1;1-1;2-0;2-1;0-2;1-1;1-2;1-1;1-1;1-0;1-1;3-2;2-1;1-2;1-0;1-1;1-1
29;Ven;19-Giu;21:00;D;Stati Uniti;Australia;;2-0;1-1;1-1;2-1;2-0;2-1;2-0;2-0;3-1;1-1;2-0;2-0;1-1;0-3;1-3;2-1;2-1;2-0;2-1;1-0;3-0;5-0;1-0;1-2;2-1;2-1;1-1;1-0;2-0;2-1;1-0;2-0;0-2;1-0;2-1;1-1;1-0;2-1
30;Sab;20-Giu;00:00;C;Scozia;Marocco;;0-1;0-2;1-2;1-2;1-2;1-2;0-2;0-1;1-1;1-2;1-0;1-1;1-2;3-1;1-2;1-1;1-1;1-2;0-2;1-1;0-1;1-1;1-3;1-1;1-2;0-2;1-1;1-0;1-2;2-2;2-1;2-2;0-0;1-1;0-1;2-2;1-1;1-2
31;Sab;20-Giu;02:30;C;Brasile;Haiti;;5-0;4-0;4-0;2-0;5-0;4-0;6-0;4-0;6-0;3-0;3-0;4-0;5-0;4-0;2-1;3-0;4-0;4-0;4-0;4-0;8-0;4-0;4-0;4-0;5-0;4-0;3-0;3-1;5-0;3-0;4-0;5-0;5-0;4-0;5-0;5-0;3-0;5-0
32;Sab;20-Giu;05:00;D;Turchia;Paraguay;;2-1;1-0;2-1;2-1;1-1;2-0;2-1;2-1;2-1;2-1;2-0;1-1;2-1;1-2;3-0;1-0;2-0;2-1;1-0;2-1;4-0;1-0;3-1;2-1;1-0;3-1;2-0;2-1;2-0;2-0;1-0;1-0;3-0;1-1;1-1;2-1;1-0;3-0
33;Sab;20-Giu;19:00;F;Olanda;Svezia;;2-0;2-2;1-1;2-1;3-0;3-1;2-1;2-0;2-2;3-1;2-1;2-1;2-1;3-1;4-0;2-0;2-0;2-1;3-0;2-0;2-1;1-1;1-0;1-1;2-1;3-1;2-0;2-1;3-1;1-0;2-1;3-1;1-0;1-1;2-2;2-0;3-1;2-1
34;Sab;20-Giu;22:00;E;Germania;Costa d'Avorio;;3-0;3-0;2-0;2-1;3-1;2-0;3-0;3-1;2-0;3-1;4-0;2-0;4-1;5-1;1-0;3-0;2-1;2-0;3-1;2-0;3-1;2-1;2-1;2-1;2-1;2-1;3-0;3-0;4-1;3-1;3-1;5-0;1-1;2-1;3-1;3-1;3-0;3-0
35;Dom;21-Giu;02:00;E;Ecuador;Curaçao;;3-0;2-0;2-0;2-0;4-0;2-0;2-0;2-1;3-0;2-0;3-1;2-0;3-0;3-2;3-1;1-0;3-0;3-0;2-0;3-0;4-0;2-0;2-0;1-1;2-0;1-0;3-0;1-0;2-2;3-0;3-0;3-0;3-0;3-1;2-0;1-1;2-0;2-0
36;Dom;21-Giu;06:00;F;Tunisia;Giappone;;0-2;1-1;1-2;1-2;1-2;0-0;0-1;1-2;1-1;1-2;0-2;0-1;1-2;2-3;1-1;2-0;0-1;1-1;0-1;0-1;0-2;0-2;1-3;1-2;0-2;0-2;1-1;0-2;1-3;1-1;2-2;0-2;0-2;0-1;1-1;2-2;1-1;0-1
37;Dom;21-Giu;18:00;H;Spagna;Arabia Saudita;;3-0;2-0;3-0;3-0;4-0;3-0;5-0;4-1;5-0;3-0;2-0;4-0;5-0;5-0;2-0;3-0;4-0;3-0;4-0;3-0;4-2;3-0;4-0;3-1;3-0;3-1;2-0;3-1;4-2;4-0;2-0;5-0;4-0;2-0;3-1;3-0;2-0;4-0
38;Dom;21-Giu;21:00;G;Belgio;Iran;;2-0;3-0;3-0;2-1;3-0;2-0;2-0;2-0;2-0;3-0;2-0;2-0;2-1;4-1;3-0;2-1;3-0;2-0;4-0;2-0;5-0;2-0;2-1;3-0;2-0;3-1;2-1;2-0;2-0;3-1;2-0;3-0;1-2;1-0;1-0;2-1;2-0;3-1
39;Lun;22-Giu;00:00;H;Uruguay;Capo Verde;;3-0;3-0;3-0;2-0;3-0;1-1;3-0;2-0;4-0;3-0;3-0;2-0;3-1;3-3;2-1;3-0;2-0;2-0;2-0;3-0;2-1;0-0;3-0;2-1;3-0;2-0;2-0;2-0;3-0;3-0;2-0;3-0;1-0;3-0;2-0;2-1;2-0;3-0
40;Lun;22-Giu;03:00;G;Nuova Zelanda;Egitto;;0-1;0-2;1-2;0-2;2-2;0-2;0-2;0-2;0-1;0-1;1-1;0-1;1-2;4-1;0-3;0-3;1-2;1-2;1-1;0-2;1-3;1-1;0-1;0-2;0-1;0-2;0-1;0-0;1-1;2-2;1-1;0-2;0-0;0-0;0-2;1-1;0-2;0-2
41;Lun;22-Giu;19:00;J;Argentina;Austria;;2-0;1-1;3-1;2-0;2-1;2-1;2-0;2-0;2-1;2-0;1-1;2-0;2-0;6-0;2-0;1-0;1-1;2-0;2-0;1-0;3-1;2-1;2-1;3-1;3-1;1-1;2-0;2-0;4-1;2-1;2-0;3-1;2-1;2-1;3-1;3-0;2-0;2-0
42;Lun;22-Giu;23:00;I;Francia;Iraq;;4-0;3-0;4-1;3-0;3-0;3-0;3-0;5-0;5-0;4-0;4-0;3-0;4-0;5-0;2-0;3-0;4-0;4-0;3-0;3-0;6-0;3-0;3-0;4-0;3-0;3-0;3-0;4-0;3-0;3-0;3-0;5-0;4-0;1-0;4-0;1-0;2-1;4-0
43;Mar;23-Giu;02:00;I;Norvegia;Senegal;;1-1;1-0;2-1;1-1;2-0;2-0;1-1;2-1;3-0;2-1;3-0;1-1;1-1;0-1;0-1;1-1;2-2;1-1;2-1;3-0;3-1;1-2;3-2;2-1;2-1;1-1;3-1;3-1;3-0;3-0;2-1;3-1;2-1;1-1;2-1;3-0;2-1;2-1
44;Mar;23-Giu;05:00;J;Giordania;Algeria;;0-2;0-0;0-0;1-2;0-2;0-0;0-1;0-1;0-3;0-1;0-1;0-2;0-3;0-4;2-2;0-2;2-0;1-2;0-2;0-2;0-2;0-2;1-3;0-0;0-1;0-1;0-2;0-1;1-1;0-1;0-1;0-3;0-3;0-1;1-2;0-1;0-1;0-1
45;Mar;23-Giu;19:00;K;Portogallo;Uzbekistan;;4-0;3-0;2-1;2-0;3-0;3-0;4-0;4-1;3-0;4-0;4-1;3-0;4-0;2-1;0-0;4-0;3-0;3-0;2-0;3-0;3-1;3-1;2-0;3-0;3-0;3-0;3-0;2-0;3-0;4-0;3-0;5-0;3-0;4-1;3-1;2-0;2-0;3-0
46;Mar;23-Giu;22:00;L;Inghilterra;Ghana;;2-0;2-0;3-1;3-0;3-0;2-1;2-0;2-0;3-0;2-1;4-1;2-0;3-1;3-2;1-0;1-1;2-1;2-0;3-0;2-1;2-2;2-0;4-2;2-2;2-0;3-1;2-0;3-0;4-1;2-1;1-0;4-0;1-1;1-0;3-1;2-0;3-1;3-0
47;Mer;24-Giu;01:00;L;Panama;Croazia;;0-3;0-2;0-2;0-2;1-2;0-2;0-4;0-1;0-3;0-2;0-1;0-2;0-2;0-4;1-3;0-4;1-2;0-2;0-2;0-2;0-4;1-2;0-2;0-1;0-2;0-2;0-2;0-4;1-3;0-3;0-2;0-3;0-2;0-3;1-3;1-2;0-2;0-2
48;Mer;24-Giu;04:00;K;Colombia;RD Congo;;2-0;1-1;2-1;2-0;3-0;2-0;2-1;2-0;4-0;1-0;2-0;2-1;2-1;3-0;3-1;2-0;2-1;2-1;2-0;2-0;2-1;2-0;4-0;1-1;2-0;2-1;2-0;2-1;1-0;2-0;1-0;3-0;2-0;2-1;2-0;2-1;2-0;1-0
49;Mer;24-Giu;21:00;B;Svizzera;Canada;;1-1;2-2;0-0;1-1;1-1;1-1;1-1;1-1;2-1;1-1;1-1;1-1;1-0;3-1;1-1;1-1;2-1;1-1;1-1;1-1;1-0;2-1;1-1;1-1;1-1;1-0;1-1;1-1;0-1;2-2;2-2;2-0;1-1;1-1;1-0;2-2;1-1;1-1
50;Mer;24-Giu;21:00;B;Bosnia ed Erzegovina;Qatar;;1-1;1-0;2-1;2-0;2-0;2-1;2-0;1-0;3-0;2-0;1-1;1-0;2-1;2-0;2-2;2-0;2-0;2-1;2-0;2-0;3-0;1-0;2-0;1-0;2-1;0-0;1-1;2-0;0-1;1-0;1-1;1-0;2-0;2-1;2-1;0-0;1-0;0-0
51;Gio;25-Giu;00:00;C;Scozia;Brasile;;0-2;0-2;0-3;0-2;0-2;1-3;1-3;0-2;1-3;0-2;1-1;0-2;1-3;2-5;1-4;1-2;1-2;0-3;0-3;0-1;1-1;0-3;2-2;1-2;0-2;0-2;1-3;1-2;1-3;2-2;1-2;1-3;0-3;0-1;1-3;1-2;0-2;1-3
52;Gio;25-Giu;00:00;C;Marocco;Haiti;;3-0;4-0;2-0;2-0;3-0;3-0;4-0;3-0;4-0;3-0;2-0;3-0;3-0;3-1;2-1;3-0;2-0;2-0;3-0;2-0;4-0;2-0;5-0;2-0;3-0;3-1;3-0;2-2;2-0;4-0;2-0;4-1;6-0;3-0;2-0;2-0;2-1;3-0
53;Gio;25-Giu;03:00;A;Repubblica Ceca;Messico;;1-2;0-0;1-1;0-1;1-1;1-1;1-1;1-1;1-2;1-1;1-1;0-1;1-2;1-3;1-1;1-1;1-1;1-2;2-2;0-1;2-2;1-2;0-2;1-1;0-1;1-1;1-1;1-0;0-1;1-2;1-1;1-1;1-2;1-1;2-1;1-1;1-1;0-0
54;Gio;25-Giu;03:00;A;Sudafrica;Corea del Sud;;0-2;2-2;0-2;1-2;1-2;2-1;1-0;0-2;1-3;2-1;1-2;0-1;1-1;1-1;0-2;0-1;1-2;1-1;0-1;0-1;0-2;1-1;1-1;2-1;1-2;1-2;1-2;1-1;0-1;1-2;1-1;0-2;0-3;1-1;1-1;2-2;1-1;1-1
55;Gio;25-Giu;22:00;E;Curaçao;Costa d'Avorio;;0-2;0-3;0-3;0-2;0-3;0-3;0-3;0-3;0-4;0-4;0-1;0-2;0-2;0-4;0-5;0-2;0-3;0-2;1-2;1-2;1-2;0-2;1-3;0-2;0-3;0-2;0-2;1-0;1-1;0-3;0-1;0-2;0-3;0-1;1-3;1-2;0-1;0-2
56;Gio;25-Giu;22:00;E;Ecuador;Germania;;1-2;0-2;2-3;1-2;0-2;0-3;0-3;1-2;0-3;0-3;0-2;0-2;1-3;1-3;0-2;0-2;0-2;1-2;1-2;1-3;2-2;1-3;1-3;1-3;1-3;0-2;0-2;1-3;1-3;1-4;1-3;0-4;0-1;0-1;1-4;1-3;1-2;0-3
57;Ven;26-Giu;01:00;F;Giappone;Svezia;;1-1;0-1;2-2;1-1;2-0;1-1;2-1;1-1;1-1;1-2;3-2;1-1;2-0;1-2;0-0;2-2;1-1;1-2;1-0;1-1;1-1;2-1;2-2;1-2;1-1;1-0;1-1;1-0;2-0;1-1;2-2;1-1;2-1;1-1;2-2;2-0;2-1;1-1
58;Ven;26-Giu;01:00;F;Tunisia;Olanda;;0-3;0-2;1-3;0-2;0-2;1-2;0-2;1-2;1-1;0-2;0-4;0-2;1-2;3-1;0-1;2-0;0-3;0-2;0-2;1-2;1-2;0-2;1-3;0-2;0-2;1-2;0-2;1-2;1-2;1-3;2-2;0-2;0-1;0-1;1-2;1-3;0-2;0-2
59;Ven;26-Giu;04:00;D;Turchia;Stati Uniti;;1-1;1-1;2-2;1-1;1-1;1-1;2-1;2-2;1-1;2-1;1-1;1-2;1-1;1-2;2-1;0-0;2-2;1-1;2-1;1-1;1-1;1-1;1-1;1-1;1-1;1-1;1-1;3-1;1-2;2-1;2-0;0-0;3-1;1-1;1-1;3-1;2-1;2-1
60;Ven;26-Giu;04:00;D;Paraguay;Australia;;1-1;1-1;1-0;1-1;2-1;1-2;2-0;0-0;1-0;1-1;1-0;1-1;2-1;1-2;0-1;0-1;1-2;1-0;2-1;1-1;1-0;2-1;2-1;2-1;0-0;1-0;2-1;1-0;1-1;1-1;3-3;1-1;0-0;0-0;1-1;2-2;1-1;1-0
61;Ven;26-Giu;21:00;I;Norvegia;Francia;;1-2;1-1;3-3;1-2;1-2;1-1;1-3;2-2;2-3;1-3;3-3;1-2;1-3;2-4;1-1;1-0;2-2;1-2;2-3;1-1;3-5;1-2;2-2;1-2;0-2;1-2;1-2;1-1;2-1;2-2;2-2;0-3;2-2;0-0;1-3;1-0;1-3;2-2
62;Ven;26-Giu;21:00;I;Senegal;Iraq;;2-0;1-0;2-0;2-0;2-1;0-0;2-0;2-0;2-0;3-0;2-1;2-0;2-0;3-1;2-0;1-0;2-0;2-0;2-0;1-0;3-0;2-0;3-1;2-0;2-0;2-0;2-1;1-0;1-2;1-1;2-0;1-0;1-0;1-0;2-1;1-1;2-1;2-1
63;Sab;27-Giu;02:00;H;Capo Verde;Arabia Saudita;;0-1;0-2;2-2;1-1;2-1;2-0;2-1;1-2;0-2;0-2;0-2;1-1;2-1;1-2;1-2;2-2;1-1;1-1;2-1;0-0;1-3;1-1;1-2;0-1;1-1;1-1;0-1;0-2;0-2;1-1;0-2;0-0;0-1;0-1;0-1;2-2;1-2;0-2
64;Sab;27-Giu;02:00;H;Uruguay;Spagna;;1-1;0-2;1-1;1-2;0-1;1-3;1-3;2-2;0-3;1-2;1-1;1-2;1-2;1-3;1-3;0-3;1-2;1-2;1-2;0-2;1-2;1-2;1-3;2-2;1-2;2-3;1-1;1-2;1-1;1-3;1-2;0-2;0-3;1-1;1-2;1-2;0-2;1-3
65;Sab;27-Giu;05:00;G;Egitto;Iran;;1-1;2-0;2-0;1-1;2-2;1-1;2-1;1-1;1-1;3-0;2-1;1-1;1-1;4-1;0-1;0-3;2-0;1-0;2-1;1-1;2-1;1-1;1-1;2-1;1-1;2-1;0-0;2-2;1-1;1-1;2-2;1-0;0-1;1-0;1-0;0-0;2-1;2-0
66;Sab;27-Giu;05:00;G;Nuova Zelanda;Belgio;;0-4;0-2;1-1;0-3;1-3;0-3;0-3;0-4;0-5;0-3;0-1;0-2;1-2;1-1;0-3;0-2;0-2;0-3;0-3;0-2;0-3;1-8;0-3;0-2;0-3;0-2;0-2;0-3;0-2;0-3;0-2;0-3;0-2;0-1;1-3;1-3;0-2;0-2
67;Sab;27-Giu;23:00;L;Panama;Inghilterra;;0-4;0-3;1-3;0-3;0-3;0-3;0-5;0-3;0-7;0-3;0-4;0-3;0-3;1-4;1-1;0-3;0-2;0-3;0-5;0-3;0-5;1-5;0-4;0-2;0-4;0-2;1-2;0-5;0-2;0-2;0-1;0-2;0-5;0-3;0-3;0-2;0-2;0-4
68;Sab;27-Giu;23:00;L;Croazia;Ghana;;2-1;2-0;0-1;2-1;2-1;1-1;2-1;1-0;2-1;2-1;1-0;1-0;1-1;2-1;2-1;2-1;2-1;2-1;1-0;2-0;1-1;1-2;2-1;2-2;2-0;2-1;1-1;3-1;2-2;2-0;2-1;2-0;1-1;2-1;3-1;1-0;2-0;2-1
69;Dom;28-Giu;01:30;K;Colombia;Portogallo;;1-2;0-2;1-2;1-2;1-2;1-2;1-2;1-1;1-1;1-3;1-1;1-2;1-3;1-5;3-0;0-1;1-2;1-2;1-2;1-1;1-1;1-2;1-2;1-2;1-2;2-2;2-2;1-3;0-0;2-2;2-2;2-2;0-3;1-1;1-3;1-3;1-2;1-2
70;Dom;28-Giu;01:30;K;RD Congo;Uzbekistan;;1-1;0-2;1-1;1-1;1-0;2-1;0-0;0-1;1-0;1-2;1-1;1-1;1-3;1-1;1-1;1-0;1-1;1-1;1-0;1-2;1-1;1-1;1-0;0-0;1-0;0-0;2-1;0-0;1-1;1-0;1-1;0-1;1-1;2-1;2-1;0-1;2-0
71;Dom;28-Giu;04:00;J;Algeria;Austria;;1-1;0-0;0-1;1-2;1-1;1-3;0-2;1-2;2-2;0-2;0-0;1-1;1-2;2-1;0-3;1-1;0-2;1-1;0-0;1-1;1-1;4-2;1-1;0-1;2-1;1-1;1-1;1-0;1-0;1-2;1-0;0-2;2-0;2-2;1-1;1-1;1-2;1-0
72;Dom;28-Giu;04:00;J;Giordania;Argentina;;0-4;0-1;0-2;0-3;0-3;0-4;0-4;0-4;0-5;0-4;0-3;0-3;0-4;1-5;3-3;0-3;1-2;0-4;0-3;0-4;1-2;0-3;0-4;0-4;0-4;0-2;0-3;0-3;0-3;0-3;0-3;0-3;0-0;0-4;0-4;0-3;0-3;0-3
""".strip()

# ── Expected totals from spreadsheet (for verification) ─────────────────────
EXPECTED_TOTALS = {
    "Pino De Giorgi": 21, "Filippo Marchello": 21, "Tony Pindinello": 19,
    "Matteo Serafino": 18, "Jacopo De Giorgi": 18, "Francesco Pastore": 17,
    "Andrea Quarto": 17, "Matteo Birilli": 16, "Stefano De Giorgi": 15,
    "Carlo Fantasia": 15, "Pino Bruno": 15, "Marco Pellè": 15,
    "Daniele Sedile": 14, "Daniele Garzya": 14, "Leonardo Piras": 14,
    "Gabriele Carrarini": 14, "Fabio Baldacci": 14, "Sergio Garzya": 13,
    "Luigi Miccoli": 13, "Mattia Pellè": 13, "Luigi Marchello": 13,
    "Andrea Sedile": 13, "Andrea Pellè": 12, "Raffaele Chiffi": 12,
    "Marco Boellis": 12, "Manuel Pellè": 11, "Marco D'Andrea": 11,
    "Simone Turturo": 11, "Giacomo Ingrosso": 10, "Edoardo Roscica": 10,
    "Marco Ingrosso": 10, "Manuel Farlò": 9, "Mattia Tramacere": 9,
    "Daniele Bove": 9, "Marco Lala": 9, "Carmine Apollonio": 9,
    "Leandro Micelli": 9, "Mattia Nicolau": 7,
}

# ── Month mapping for Italian dates ─────────────────────────────────────────
MONTH_MAP = {"Gen": "01", "Feb": "02", "Mar": "03", "Apr": "04", "Mag": "05",
             "Giu": "06", "Lug": "07", "Ago": "08", "Set": "09", "Ott": "10",
             "Nov": "11", "Dic": "12"}


def parse_score(s):
    """Parse score string '2-0' → (2, 0). Handles '1 -1', '0'-2' edge cases."""
    if not s or not s.strip():
        return None, None
    s = s.strip().replace("'", "").replace(" ", "")
    m = re.match(r"(\d+)-(\d+)", s)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def parse_date(date_str, time_str):
    """Convert '11-Giu' + '21:00' → '2026-06-11T21:00:00'"""
    parts = date_str.split("-")
    day = int(parts[0])
    month = MONTH_MAP.get(parts[1], "06")
    return f"2026-{month}-{day:02d}T{time_str}:00"


def main():
    print("=" * 60)
    print("TOTOMONDIALE 2026 - Data Import")
    print("=" * 60)

    # Parse match data
    partite_list = []
    all_predictions = {name: {} for name in PARTICIPANTS}

    for line in MATCH_DATA.split("\n"):
        line = line.strip()
        if not line:
            continue
        cols = line.split(";")
        if len(cols) < 8:
            continue

        match_id = int(cols[0])
        giorno = cols[1]
        data_iso = parse_date(cols[2], cols[3])
        gruppo = cols[4]
        home = cols[5]
        away = cols[6]
        result_str = cols[7]

        home_score, away_score = parse_score(result_str)
        conclusa = home_score is not None

        partite_list.append({
            "id": match_id,
            "giorno": giorno,
            "data": data_iso,
            "fase": "gironi",
            "gruppo": gruppo,
            "home": home,
            "away": away,
            "home_score": home_score,
            "away_score": away_score,
            "conclusa": conclusa,
        })

        # Parse predictions for each participant
        for i, name in enumerate(PARTICIPANTS):
            col_idx = 8 + i
            if col_idx < len(cols):
                pred_str = cols[col_idx]
                ph, pa = parse_score(pred_str)
                if ph is not None:
                    all_predictions[name][str(match_id)] = {
                        "home_score": ph,
                        "away_score": pa,
                    }

    # Build pronostici.json
    pronostici = {"partecipanti": {}}
    for i, name in enumerate(PARTICIPANTS):
        pronostici["partecipanti"][name] = {
            "partite": all_predictions[name],
            "premi_finali": {
                "vincitore": VINCITORE[i],
                "finalista": FINALISTA[i],
                "capocannoniere": CAPOCANNONIERE[i],
                "mvp": MVP[i],
                "portiere": PORTIERE[i],
                "giovane": GIOVANE[i],
            },
            # passaggio_turno non ancora compilato (siamo ai gironi)
        }

    # Build partite.json
    partite_data = {
        "partite": partite_list,
        "passaggio_turno": {
            "sedicesimi": [],
            "ottavi": [],
            "quarti": [],
            "semifinali": [],
            "finale": [],
        },
        "premi_finali": {
            "vincitore": None,
            "finalista": None,
            "capocannoniere": None,
            "mvp": None,
            "portiere": None,
            "giovane": None,
        },
    }

    # Write JSON files
    with open("partite.json", "w", encoding="utf-8") as f:
        json.dump(partite_data, f, indent=2, ensure_ascii=False)
    print(f"✅ partite.json creato con {len(partite_list)} partite.")
    print(f"   - Concluse: {sum(1 for p in partite_list if p['conclusa'])}")
    print(f"   - Da giocare: {sum(1 for p in partite_list if not p['conclusa'])}")

    with open("pronostici.json", "w", encoding="utf-8") as f:
        json.dump(pronostici, f, indent=2, ensure_ascii=False)
    print(f"✅ pronostici.json creato con {len(PARTICIPANTS)} partecipanti.")

    # Verify totals by running the scoring logic inline
    print("\n--- Verifica Punteggi ---")
    partite_map = {m["id"]: m for m in partite_list}
    errors_found = 0

    for name in PARTICIPANTS:
        user_data = pronostici["partecipanti"][name]
        pts = 0
        esatti = 0
        segni = 0
        errori = 0

        for mid_str, pred in user_data["partite"].items():
            mid = int(mid_str)
            match = partite_map.get(mid)
            if not match or not match["conclusa"]:
                continue
            rh, ra = match["home_score"], match["away_score"]
            ph, pa = pred["home_score"], pred["away_score"]

            if rh == ph and ra == pa:
                pts += 3
                esatti += 1
            else:
                # Check sign
                r_sign = "1" if rh > ra else ("2" if rh < ra else "X")
                p_sign = "1" if ph > pa else ("2" if ph < pa else "X")
                if r_sign == p_sign:
                    pts += 1
                    segni += 1
                else:
                    errori += 1

        expected = EXPECTED_TOTALS.get(name, -1)
        status = "✅" if pts == expected else "❌"
        if pts != expected:
            errors_found += 1
        print(f"  {status} {name}: {pts} pts (Esatti: {esatti}, Segni: {segni}, Err: {errori}) [atteso: {expected}]")

    if errors_found == 0:
        print(f"\n🎉 Tutti i {len(PARTICIPANTS)} punteggi corrispondono ai dati del foglio Excel!")
    else:
        print(f"\n⚠️  {errors_found} punteggi non corrispondono. Verificare i dati.")


if __name__ == "__main__":
    main()
