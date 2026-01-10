const CARD_DATABASE = [
    // === 蜀 (SHU) ===
    {
        id: "shu_infantry",
        name: "蜀汉步兵",
        nation: "shu",
        type: "unit",
        cost: 1,
        opCost: 1,
        attack: 1,
        defense: 2,
        traits: [],
        text: "普通步兵。",
        image: "步"
    },
    {
        id: "shu_archer",
        name: "连弩兵",
        nation: "shu",
        type: "unit",
        cost: 2,
        opCost: 1,
        attack: 2,
        defense: 1,
        traits: ["ranged"], // 远程：攻击时不反击 (KARDS 中无此机制，这里可以简化为无) -> 这里先用 blitz 模拟远程的先手优势，或者不做特殊处理
        text: "部署时造成1点伤害(未实现)。",
        image: "弩"
    },
    {
        id: "shu_guard",
        name: "白毦兵",
        nation: "shu",
        type: "unit",
        cost: 3,
        opCost: 1,
        attack: 2,
        defense: 4,
        traits: ["guard"],
        text: "守护。",
        image: "盾"
    },
    {
        id: "shu_general",
        name: "赵云",
        nation: "shu",
        type: "unit",
        cost: 5,
        opCost: 1,
        attack: 5,
        defense: 5,
        traits: ["heavy_armor"], // 只有1点伤害减免
        text: "一身是胆：受到伤害-1。",
        image: "云"
    },
    {
        id: "shu_order_recruit",
        name: "桃园结义",
        nation: "shu",
        type: "order",
        cost: 2,
        text: "抽两张牌。",
        effect: "draw_2",
        image: "义"
    },

    // === 魏 (WEI) ===
    {
        id: "wei_cavalry",
        name: "虎豹骑",
        nation: "wei",
        type: "unit",
        cost: 3,
        opCost: 1,
        attack: 3,
        defense: 3,
        traits: ["blitz"],
        text: "闪击。",
        image: "骑"
    },
    {
        id: "wei_scout",
        name: "轻骑斥候",
        nation: "wei",
        type: "unit",
        cost: 1,
        opCost: 0, // 0费移动
        attack: 1,
        defense: 1,
        traits: ["blitz"],
        text: "闪击，0费行动。",
        image: "斥"
    },
    {
        id: "wei_heavy",
        name: "重装铁骑",
        nation: "wei",
        type: "unit",
        cost: 6,
        opCost: 2,
        attack: 7,
        defense: 6,
        traits: ["heavy_armor"],
        text: "重甲1。",
        image: "铁"
    },
    {
        id: "wei_general",
        name: "张辽",
        nation: "wei",
        type: "unit",
        cost: 4,
        opCost: 1,
        attack: 4,
        defense: 4,
        traits: ["blitz"],
        text: "闪击。部署时：如果你控制前线，抽一张牌(未实现)。",
        image: "辽"
    },
    {
        id: "wei_order_strike",
        name: "急袭",
        nation: "wei",
        type: "order",
        cost: 1,
        text: "对一个目标造成2点伤害。",
        effect: "damage_2",
        image: "袭"
    }
];

// 简单的套牌生成器
function createDeck(nation) {
    const deck = [];
    const nationCards = CARD_DATABASE.filter(c => c.nation === nation);
    
    // 填充30张牌
    for (let i = 0; i < 30; i++) {
        const randomCard = nationCards[Math.floor(Math.random() * nationCards.length)];
        // 深拷贝卡牌对象，因为游戏中状态会变
        deck.push(JSON.parse(JSON.stringify(randomCard)));
    }
    return deck;
}
