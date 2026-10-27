// Manual — português
export default {
  title: 'Manual LuxInterventions',
  sub: 'A central e as suas aplicações — guia ilustrado',
  toc: 'Índice',
  shotsNote: 'As capturas mostram dados de exemplo fictícios.',
  sec: {
    intro: ['Visão geral', `
<p>A LuxInterventions reúne numa única <b>central</b> tudo o que é preciso para gerir imóveis: intervenções técnicas, inquilinos, rendas, hotéis, Airbnb, táxis, agências, proprietários e contabilidade. À volta da central, cada pessoa recebe a sua própria aplicação, sem palavra-passe: basta um <b>código de acesso</b>.</p>
<table><tr><th>Aplicação</th><th>Para quem</th><th>O que faz</th></tr>
<tr><td>🏢 Central</td><td>Você (gestor)</td><td>Gerir tudo, criar os acessos das outras aplicações</td></tr>
<tr><td>🏠 Espaço do inquilino</td><td>Inquilinos</td><td>Pedidos de intervenção, documentos, rendas, mensagens</td></tr>
<tr><td>🛠️ Equipa</td><td>Técnicos</td><td>Intervenções do dia, fotos, assinatura, fim do trabalho</td></tr>
<tr><td>🛎️ A minha estadia</td><td>Clientes de hotel / Airbnb</td><td>Chegada, táxi, quarto, serviços, mensagens</td></tr>
<tr><td>🚕 Táxi</td><td>Empresas de táxi</td><td>Motoristas, carros, tarifas, corridas a aceitar</td></tr>
<tr><td>📣 Anúncios</td><td>Restaurantes, bares (HORECA)</td><td>Publicidade, menus, eventos nas aplicações</td></tr>
<tr><td>🔑 Central do cliente</td><td>Gestoras, agências, hotéis clientes</td><td>A sua própria central, com licença</td></tr></table>
<p>Todos os dados são <b>cifrados no aparelho</b> antes de serem enviados: o servidor só guarda cofres ilegíveis.</p>`],
    start: ['Primeiros passos', `
<ol><li>Abra a central no telemóvel ou no computador e escolha a sua <b>chave de acesso</b> (uma frase longa que só você conhece). Guarde-a num lugar seguro: sem ela ninguém — nem nós — consegue ler os dados.</li>
<li>No telemóvel, adicione a central ao ecrã principal: passa a abrir como uma aplicação.</li>
<li>A central só está aberta <b>num aparelho de cada vez</b>. Se a abrir noutro lado, toque em <b>«Assumir o controlo»</b>: o outro aparelho fecha-se.</li>
<li>O idioma escolhe-se em <b>Definições</b> (francês, italiano, alemão, inglês, português, espanhol).</li></ol>
<p>No telemóvel o menu é uma barra em baixo que desliza com o dedo; no computador fica à esquerda. Os botões <b>＋</b> criam logo uma ficha.</p>`],
    accueil: ['Início', `
<p>O início resume o dia: intervenções abertas e urgentes, rendas pendentes, chegadas ao hotel, mensagens não lidas. Toque num número para ir diretamente à lista correspondente.</p>`],
    maintenance: ['Manutenção e intervenções', `
<p><b>Manutenção</b> reúne todas as intervenções: as criadas por si, as pedidas pelos inquilinos e as enviadas pelos seus clientes com licença.</p>
<ol><li>Toque em <b>＋</b> para criar uma intervenção: imóvel, fração, descrição, urgência, fotos.</li>
<li>Escolha o <b>técnico</b>: recebe-a de imediato na sua aplicação Equipa.</li>
<li>Siga o estado: a fazer, em curso, terminada. O técnico junta fotos e assinatura; você valida.</li></ol>
<p>A ficha de um técnico contém contactos, profissão e o separador <b>App</b> que cria o seu código de acesso. A <b>Classificação</b> premeia os inquilinos mais ativos («inquilino do ano»).</p>`],
    proprietes: ['As minhas propriedades', `
<p>Aqui regista os seus imóveis e as respetivas frações (apartamentos, estúdios, escritórios, garagens…). Cada fração pode receber um inquilino. Os separadores <b>Inquilinos</b> e <b>Gestão inq.</b> ficam nesta secção.</p>`],
    locataires: ['Inquilinos e a sua aplicação', `
<ol><li>Em <b>Inquilinos</b>, toque em <b>＋</b> e preencha a ficha: nome, telefone, fração, renda, encargos, início do contrato.</li>
<li>Abra a ficha, separador <b>Espaço</b>, e ative o <b>espaço do inquilino</b>: aparece um código de acesso.</li>
<li>Envie o link e o código ao inquilino (WhatsApp, SMS, e-mail). Ele abre a aplicação, escreve o código, e pronto.</li>
<li>Se o inquilino perder o código, abra de novo o separador <b>Espaço</b> e crie um <b>novo código</b>: o antigo deixa de funcionar.</li></ol>`],
    loyers: ['Rendas', `
<p><b>Gestão inq.</b> mostra, mês a mês, as rendas previstas, pagas e em atraso. Registe um pagamento com um toque; o inquilino encontra os recibos na sua aplicação.</p>`],
    hotel: ['Hotel', `
<p>A secção <b>Hotel</b> gere quartos e clientes.</p>
<ol><li><b>Definições do hotel</b>: nome, morada, serviços, menu em PDF.</li>
<li><b>Quartos</b>: número, piso, categoria, tipo, número de pessoas, m², descrição e <b>vistoria de entrada</b> com fotos.</li>
<li><b>Cliente</b>: nome, país (com bandeira), datas, quarto, regime de refeições, preferências e alergias, até 7 fotos. Ao gravar, cria-se um <b>código</b> para a aplicação <b>A minha estadia</b>.</li>
<li>À saída, faça a <b>vistoria de saída</b> do cliente.</li></ol>`],
    airbnb: ['Airbnb', `
<p>A secção <b>Airbnb</b> funciona como o hotel, para alojamentos alugados à noite: alojamentos, hóspedes, vistorias, código da aplicação A minha estadia.</p>`],
    taxis: ['Táxis', `
<p>Registe as empresas de táxi parceiras. Cada empresa recebe um código para a sua aplicação <b>Táxi</b>, onde gere motoristas, carros e tarifas. Quando um cliente pede um táxi em A minha estadia, a empresa recebe a corrida, aceita-a ou recusa-a, e o cliente acompanha a chegada.</p>`],
    agences: ['Agências, proprietários e património', `
<p><b>Agências</b>: as agências imobiliárias parceiras. Uma agência pode trabalhar <b>por conta própria</b>, para <b>proprietários</b> ou para <b>fundos de investimento</b>.</p>
<p><b>Proprietários</b>: os proprietários dos imóveis que gere.</p>
<p><b>Património</b>: em cada ficha indique, por tipo de bem (apartamentos, estúdios, garagens, estacionamentos, escritórios, restaurantes…), a quantidade com o menu 1…10 / 10+ e depois o número exato.</p>`],
    gerances: ['Gestoras', `
<p>As gestoras de condomínio com que trabalha: contactos, imóveis acompanhados, património. Podem também receber a sua própria central com licença.</p>`],
    compta: ['Contabilidade, assinaturas e anunciantes', `
<p><b>Contabilidade</b>: receitas e despesas, faturas das intervenções, totais mensais.</p>
<p><b>Assinaturas</b>: as assinaturas dos clientes e o separador <b>Anunciantes</b> (HORECA). Crie um anunciante: recebe um código para a aplicação <b>Anúncios</b>. Os seus anúncios chegam aqui para <b>aprovação</b> antes de aparecerem nas aplicações.</p>
<p>O pagamento online ainda não está ligado: o botão é visível mas indica «não ligado».</p>`],
    reglages: ['Definições', `
<p>Idioma, dados da empresa, cópia de segurança: <b>Cópia de segurança cifrada</b> cria um ficheiro .ares legível só com a sua chave, <b>Exportação legível</b> um ficheiro JSON não cifrado, <b>Importar</b> carrega um ou outro. Faça cópias regulares e guarde-as fora do telemóvel. Aqui ficam também as <b>Licenças</b>.</p>`],
    licences: ['Licenças', `
<p>Pode dar aos seus clientes (gestoras, agências, proprietários, hotéis, Airbnb) <b>uma central própria</b>, separada e cifrada.</p>
<ol><li><b>Tarifas</b>: para cada setor, o preço de um ano e o desconto para 2 e 3 anos.</li>
<li><b>＋ Cliente</b>: setor, nome, telefone. O cliente começa com um <b>período de teste fixo de 15 dias</b> e recebe um código de acesso.</li>
<li>Na ficha do cliente escolha o pacote de <b>1, 2 ou 3 anos</b>: o preço muda conforme o pacote. É criada uma fatura PDF, marcada paga ou por pagar.</li>
<li>No fim do prazo, a central do cliente passa a <b>só leitura</b>; pode <b>bloqueá-la</b>, criar um novo acesso ou <b>apagá-la</b> (é emitido um certificado de eliminação).</li></ol>
<p>A página Licenças mostra também estatísticas, registo e exportação CSV.</p>`],
    client: ['A central do cliente', `
<p>O cliente abre a sua central com o código e escolhe a sua própria chave. Só vê as secções do seu setor, com uma faixa de teste ou de prazo. Gere ele próprio os seus bens; as <b>intervenções</b> continuam a ser feitas pela LuxInterventions: os seus <b>pedidos</b> chegam cifrados diretamente à sua <b>Manutenção</b>.</p>`],
    appLoc: ['Aplicação Espaço do inquilino', `
<p>O inquilino vê a sua casa, rendas e documentos. Envia um <b>pedido de intervenção</b> com fotos e acompanha o seu andamento. Recebe as suas mensagens e avisos.</p>`],
    appEq: ['Aplicação Equipa', `
<p>O técnico vê as intervenções do dia com morada e itinerário. Junta fotos antes/depois, recolhe a assinatura e fecha a intervenção: você vê-o logo na central.</p>`],
    appSejour: ['Aplicação A minha estadia e página do motorista', `
<p>O cliente do hotel ou do Airbnb abre <b>A minha estadia</b> com o seu código: estadia, quarto, serviços, menu, mensagens.</p>
<p><b>Chegada</b>: escolhe «por conta própria» ou <b>táxi</b>. Com táxi vê a distância em km e o preço em €, e acompanha a hora de chegada do motorista. Durante a estadia pode reservar um motorista.</p>
<p>O motorista recebe um <b>link</b> (nada a instalar): «vou buscar», «estou no local», «cliente a bordo», «cheguei». Só é transmitida a hora de chegada, nunca a posição.</p>`],
    appTaxi: ['Aplicação Táxi', `
<p>A empresa de táxi regista os seus <b>motoristas</b> e <b>carros</b> em três classes: <b>luxo</b>, <b>conforto</b> e <b>eco</b>, com tarifas (bandeirada, km, hora, dia) e extras (receção, bebidas, guarda-costas…). Recebe as corridas, aceita-as ou recusa-as e atribui o motorista.</p>`],
    appAnn: ['Aplicação Anúncios (HORECA)', `
<p>O restaurante ou bar cria os seus <b>anúncios</b>, menus e eventos: texto, imagem, dias e horas, faixa horária, aplicações-alvo e preço. Cada anúncio é enviado para aprovação na central antes de ser publicado.</p>`],
    secu: ['Segurança e boas práticas', `
<ul><li>Os dados são cifrados no aparelho; a sua chave nunca é enviada.</li>
<li>Nunca partilhe a sua chave; as outras aplicações usam os seus próprios códigos, que pode substituir a qualquer momento.</li>
<li>Faça cópias de segurança (Definições → Cópia de segurança cifrada) e guarde-as fora do telemóvel; a exportação legível não é cifrada.</li>
<li>Só um aparelho abre a central: «Assumir o controlo» fecha o outro.</li></ul>`],
  },
};
