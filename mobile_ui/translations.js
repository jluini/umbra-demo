// Mobile UI translations (host-owned). Dependencies: none.
(() => {
"use strict";

const uiTranslations = {
  en: {
    ui: {
      menu: { briefing: "View briefing", backToMenu: "Back to menu", restart: "Restart" },
      briefing: { start: "Start", close: "Continue" },
      confirm: {
        abort: { title: "Abort the mission?", message: "You will lose your progress and return to the menu." },
        restart: { title: "Restart the mission?", message: "You will lose your current progress and the mission will start over.", accept: "Restart" },
        switch: { title: "Change mission?", message: "You will lose your current progress and the mission will start over.", accept: "Change" },
      },
      result: { victory: "Mission accomplished", defeat: "Mission failed" },
      plan: {
        moveTo: "Move to…",
        chooseDestination: "Choose a destination",
        chooseHint: "Tap a reachable place on the map. Dimmed ones have no route.",
        goTo: "Go to",
        tripInfo: "trip · choose how to go",
        arrives: "arrives",
        onTheWayTo: "On the way to",
        viewMap: "Map",
        viewList: "List",
      },
      means: { dropToTravel: "You must drop {items} to travel." },
      item: {
        none: "No items",
        giveTo: "Give to…",
        givePrefix: "Give",
        giveSuffix: " to…",
        noRecipients: "There is no one else here to receive it.",
        dropHere: "Drop here",
        take: "Take",
        cannotTake: "You can't carry it; it's used to travel.",
        reservedBy: "Reserved by",
        noTakers: "There is no one here to take it.",
      },
      trade: { title: "Trade", cost: "for", missingCost: "You don't have the items for this trade." },
      notice: { planBlocked: "Can't do that: it would invalidate a travel plan.", plansCancelled: "A travel plan was cancelled (it was no longer valid)." },
    },
  },
  es: {
    ui: {
      menu: {
        briefing: "Ver briefing",
        backToMenu: "Volver al menú",
        restart: "Reiniciar",
      },
      briefing: {
        start: "Comenzar",
        close: "Continuar",
      },
      confirm: {
        abort: { title: "¿Abortar la misión?", message: "Vas a perder el progreso y volver al menú." },
        restart: { title: "¿Reiniciar la misión?", message: "Vas a perder el progreso actual y la misión comenzará de nuevo.", accept: "Reiniciar" },
        switch: { title: "¿Cambiar de misión?", message: "Vas a perder el progreso actual y la misión empezará de nuevo.", accept: "Cambiar" },
      },
      result: {
        victory: "Misión cumplida",
        defeat: "Misión fallida",
      },
      plan: {
        moveTo: "Moverse a…",
        chooseDestination: "Elegir destino",
        chooseHint: "Tocá un lugar alcanzable en el mapa. Los atenuados no tienen ruta.",
        goTo: "Ir a",
        tripInfo: "de viaje · elegí cómo ir",
        arrives: "llega",
        onTheWayTo: "En camino a",
        viewMap: "Mapa",
        viewList: "Lista",
      },
      means: {
        dropToTravel: "Debe dejar {items} para viajar.",
      },
      item: {
        none: "Sin objetos",
        giveTo: "Dar a…",
        givePrefix: "Dar",
        giveSuffix: " a…",
        noRecipients: "No hay nadie más aquí para recibirlo.",
        dropHere: "Dejar aquí",
        take: "Tomar",
        cannotTake: "No se puede llevar; se usa para viajar.",
        reservedBy: "Reservado por",
        noTakers: "No hay nadie aquí para tomarlo.",
      },
      trade: {
        title: "Intercambiar",
        cost: "por",
        missingCost: "Faltan objetos para este intercambio.",
      },
      notice: {
        planBlocked: "No se puede: invalidaría un plan de viaje.",
        plansCancelled: "Se canceló un plan de viaje (ya no era válido).",
      },
    },
  },
  pt: {
    ui: {
      menu: { briefing: "Ver briefing", backToMenu: "Voltar ao menu", restart: "Reiniciar" },
      briefing: { start: "Começar", close: "Continuar" },
      confirm: {
        abort: { title: "Abortar a missão?", message: "Você vai perder o progresso e voltar ao menu." },
        restart: { title: "Reiniciar a missão?", message: "Você vai perder o progresso atual e a missão vai começar de novo.", accept: "Reiniciar" },
        switch: { title: "Trocar de missão?", message: "Você vai perder o progresso atual e a missão vai começar de novo.", accept: "Trocar" },
      },
      result: { victory: "Missão cumprida", defeat: "Missão falhou" },
      plan: {
        moveTo: "Mover-se para…",
        chooseDestination: "Escolher destino",
        chooseHint: "Toque um lugar alcançável no mapa. Os esmaecidos não têm rota.",
        goTo: "Ir para",
        tripInfo: "de viagem · escolha como ir",
        arrives: "chega",
        onTheWayTo: "A caminho de",
        viewMap: "Mapa",
        viewList: "Lista",
      },
      means: { dropToTravel: "Você deve deixar {items} para viajar." },
      item: {
        none: "Sem objetos",
        giveTo: "Dar para…",
        givePrefix: "Dar",
        giveSuffix: " para…",
        noRecipients: "Não há mais ninguém aqui para receber.",
        dropHere: "Deixar aqui",
        take: "Pegar",
        cannotTake: "Não pode ser carregado; serve para viajar.",
        reservedBy: "Reservado por",
        noTakers: "Não há ninguém aqui para pegar.",
      },
      trade: { title: "Trocar", cost: "por", missingCost: "Faltam objetos para esta troca." },
      notice: { planBlocked: "Não pode: invalidaria um plano de viagem.", plansCancelled: "Um plano de viagem foi cancelado (não era mais válido)." },
    },
  },
};

window.MobileTranslations = uiTranslations;
})();
