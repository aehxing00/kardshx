// 游戏状态
const state = {
    turn: 1,
    currentPlayer: 'player', // 'player' or 'opponent'
    gameOver: false,
    
    player: {
        id: 'player',
        hp: 20,
        kredits: 1,
        kreditsMax: 1,
        deck: [],
        hand: [],
        supportLine: [], // 单位数组
    },
    
    opponent: {
        id: 'opponent',
        hp: 20,
        kredits: 1,
        kreditsMax: 1,
        deck: [],
        hand: [],
        supportLine: [],
    },
    
    frontline: {
        controller: null, // 'player', 'opponent', or null
        units: [] // 单位数组
    },

    selectedCard: null, // 手牌中选中的牌
    selectedUnit: null, // 战场上选中的单位
};

// 初始化游戏
function initGame() {
    state.player.deck = createDeck('shu');
    state.opponent.deck = createDeck('wei');
    
    shuffle(state.player.deck);
    shuffle(state.opponent.deck);
    
    // 初始抽牌
    drawCards(state.player, 4);
    drawCards(state.opponent, 4);
    
    // 随机先手 (这里固定玩家先手方便调试)
    state.currentPlayer = 'player';
    
    render();
    log("游戏开始！蜀汉 (玩家) vs 曹魏 (敌军)");
}

// 辅助函数：洗牌
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 辅助函数：抽牌
function drawCards(playerState, count) {
    for (let i = 0; i < count; i++) {
        if (playerState.deck.length > 0) {
            if (playerState.hand.length < 9) { // 手牌上限
                const card = playerState.deck.pop();
                // 给卡牌一个运行时唯一ID，方便DOM操作
                card.uid = Math.random().toString(36).substr(2, 9);
                playerState.hand.push(card);
            } else {
                log("手牌已满，爆牌！");
            }
        } else {
            // 疲劳伤害？暂时忽略
            log("牌库已空！");
        }
    }
}

// 回合结束
function endTurn() {
    if (state.gameOver) return;

    state.selectedCard = null;
    state.selectedUnit = null;

    // 切换玩家
    state.currentPlayer = state.currentPlayer === 'player' ? 'opponent' : 'player';
    
    const activePlayer = state.currentPlayer === 'player' ? state.player : state.opponent;
    
    // 增加 Kredit 上限 (最大 12)
    if (activePlayer.kreditsMax < 12) {
        activePlayer.kreditsMax++;
    }
    // 回满 Kredit
    activePlayer.kredits = activePlayer.kreditsMax;
    
    // 抽一张牌
    drawCards(activePlayer, 1);
    
    // 重置所有单位状态 (行动力)
    resetUnits(state.player.supportLine);
    resetUnits(state.opponent.supportLine);
    resetUnits(state.frontline.units);

    log(`=== ${state.currentPlayer === 'player' ? '我方' : '敌方'} 回合 ===`);
    
    render();

    // 如果是 AI 回合，简单的 AI 逻辑
    if (state.currentPlayer === 'opponent') {
        setTimeout(aiTurn, 1000);
    }
}

function resetUnits(units) {
    units.forEach(u => {
        u.hasAttacked = false;
        u.hasMoved = false;
        u.isDeployedThisTurn = false;
    });
}

// AI 逻辑
function aiTurn() {
    if (state.gameOver) return;
    
    const ai = state.opponent;
    const player = state.player;
    
    // 1. 尝试部署单位
    // 简单的贪心算法：从手牌找能打出的最贵的单位
    const playableUnits = ai.hand.filter(c => c.type === 'unit' && c.cost <= ai.kredits)
                                 .sort((a, b) => b.cost - a.cost);
    
    if (playableUnits.length > 0 && ai.supportLine.length < 5) { // 假设后排上限5
        const cardToPlay = playableUnits[0];
        playCard(ai, cardToPlay);
    }

    // 2. 尝试移动到前线
    // 如果前线是空的，或者已经是自己的，且后排有单位可以移动
    const canMoveToFront = state.frontline.controller === null || state.frontline.controller === 'opponent';
    if (canMoveToFront) {
        // 找一个能动的单位
        const mover = ai.supportLine.find(u => !u.hasMoved && !u.isDeployedThisTurn && u.opCost <= ai.kredits);
        if (mover) {
            moveUnit(ai, mover, 'support', 'frontline');
        }
    }

    // 3. 攻击
    // 前线单位攻击
    if (state.frontline.controller === 'opponent') {
        state.frontline.units.forEach(u => {
            if (!u.hasAttacked && u.opCost <= ai.kredits) {
                // 优先打前线（如果有），否则打 HQ 或 后排
                // 简化：直接打 HQ
                attack(ai, u, player, null); 
            }
        });
    }
    
    // 后排单位攻击 (如果有远程? 暂无远程逻辑，只能打前线)
    // 暂时略过后排攻击逻辑，除非对面占据前线

    setTimeout(endTurn, 1000);
}

// 核心动作：打出卡牌
function playCard(playerState, card) {
    if (playerState.kredits < card.cost) return;

    if (card.type === 'unit') {
        if (playerState.supportLine.length >= 4) { // 限制一排4个
            log("后排已满！");
            return;
        }
        
        // 支付费用
        playerState.kredits -= card.cost;
        
        // 从手牌移除
        const index = playerState.hand.indexOf(card);
        playerState.hand.splice(index, 1);
        
        // 加入战场
        const unit = { ...card, currentHp: card.defense, isDeployedThisTurn: true, hasMoved: false, hasAttacked: false };
        if (unit.traits.includes('blitz')) {
            unit.isDeployedThisTurn = false; // 闪击可以直接行动
        }
        playerState.supportLine.push(unit);
        
        log(`${playerState.id === 'player' ? '我方' : '敌方'} 部署了 ${unit.name}`);
    } else if (card.type === 'order') {
        // 简单实现指令：造成伤害
        if (card.effect === 'damage_2') {
             // 随机打一个敌方单位
             const targets = [...state.opponent.supportLine, ...state.frontline.units.filter(() => state.frontline.controller === 'opponent')];
             if (targets.length > 0) {
                 const target = targets[Math.floor(Math.random() * targets.length)];
                 target.currentHp -= 2;
                 log(`急袭对 ${target.name} 造成 2 点伤害！`);
                 if (target.currentHp <= 0) killUnit(target);
             } else {
                 state.opponent.hp -= 2;
                 log(`急袭对 敌方HQ 造成 2 点伤害！`);
                 checkWinCondition();
             }
        } else if (card.effect === 'draw_2') {
            drawCards(playerState, 2);
            log("桃园结义：抽了2张牌");
        }
        playerState.kredits -= card.cost;
        const index = playerState.hand.indexOf(card);
        playerState.hand.splice(index, 1);
    }
    
    render();
}

// 核心动作：移动单位
function moveUnit(playerState, unit, fromZone, toZone) {
    if (unit.opCost > playerState.kredits) return;
    if (unit.hasMoved) return;
    if (unit.isDeployedThisTurn) return;

    // 逻辑检查
    if (fromZone === 'support' && toZone === 'frontline') {
        if (state.frontline.controller && state.frontline.controller !== playerState.id) {
            log("前线被敌军占据，无法移动！");
            return;
        }
        
        // 支付费用
        playerState.kredits -= unit.opCost;
        
        // 移动
        const index = playerState.supportLine.indexOf(unit);
        playerState.supportLine.splice(index, 1);
        
        state.frontline.units.push(unit);
        state.frontline.controller = playerState.id;
        
        unit.hasMoved = true;
        log(`${unit.name} 移动到了前线`);
    }
    
    render();
}

// 核心动作：攻击
function attack(attackerPlayer, attackerUnit, defenderPlayer, targetUnit) {
    if (attackerUnit.opCost > attackerPlayer.kredits) {
        log("行动点不足！");
        return;
    }
    if (attackerUnit.hasAttacked) {
        log("该单位已攻击过！");
        return;
    }
    if (attackerUnit.isDeployedThisTurn && !attackerUnit.traits.includes('blitz')) {
        log("部署回合无法攻击！");
        return;
    }

    // 支付费用
    attackerPlayer.kredits -= attackerUnit.opCost;
    attackerUnit.hasAttacked = true;

    // 攻击目标是 HQ
    if (!targetUnit) {
        // 检查是否有守护 (Guard) 在前线阻挡
        // 规则：如果前线有敌军，且攻击者不在前线，必须先攻击前线？
        // KARDS规则：如果敌方占据前线，你必须先消灭前线单位才能攻击 HQ 或后排（除非你是轰炸机/火炮）。
        // 简化实现：如果敌方控制前线，且目标不在前线，则无法攻击。
        
        const enemyControlsFront = state.frontline.controller === defenderPlayer.id && state.frontline.units.length > 0;
        const attackerInFront = state.frontline.units.includes(attackerUnit);
        
        if (enemyControlsFront && !attackerInFront) {
             // 攻击者如果在后排，必须先打前线
             // 但这里 targetUnit 是 null (HQ)，所以不能打 HQ
             log("必须先清除前线敌军！");
             attackerPlayer.kredits += attackerUnit.opCost; // 退费
             attackerUnit.hasAttacked = false;
             return;
        }
        
        defenderPlayer.hp -= attackerUnit.attack;
        log(`${attackerUnit.name} 攻击 HQ，造成 ${attackerUnit.attack} 点伤害！`);
        checkWinCondition();
    } else {
        // 攻击单位
        // 战斗结算
        let damageToTarget = attackerUnit.attack;
        let damageToAttacker = targetUnit.attack;
        
        // 重甲处理
        if (targetUnit.traits.includes('heavy_armor')) damageToTarget = Math.max(0, damageToTarget - 1);
        if (attackerUnit.traits.includes('heavy_armor')) damageToAttacker = Math.max(0, damageToAttacker - 1);
        
        targetUnit.currentHp -= damageToTarget;
        attackerUnit.currentHp -= damageToAttacker; // 反击
        
        log(`${attackerUnit.name} 攻击 ${targetUnit.name} (双方伤害: ${damageToTarget} / ${damageToAttacker})`);
        
        // 死亡判定
        if (targetUnit.currentHp <= 0) {
            killUnit(targetUnit);
        }
        if (attackerUnit.currentHp <= 0) {
            killUnit(attackerUnit);
        }
    }
    
    render();
}

function killUnit(unit) {
    // 从各个区域移除
    let index = state.player.supportLine.indexOf(unit);
    if (index > -1) state.player.supportLine.splice(index, 1);
    
    index = state.opponent.supportLine.indexOf(unit);
    if (index > -1) state.opponent.supportLine.splice(index, 1);
    
    index = state.frontline.units.indexOf(unit);
    if (index > -1) {
        state.frontline.units.splice(index, 1);
        if (state.frontline.units.length === 0) {
            state.frontline.controller = null; // 前线空置
        }
    }
}

function checkWinCondition() {
    if (state.player.hp <= 0) {
        state.gameOver = true;
        log("游戏结束！你输了！", true);
    } else if (state.opponent.hp <= 0) {
        state.gameOver = true;
        log("游戏结束！你赢了！", true);
    }
}

// UI 渲染
function render() {
    // 更新 HQ 和 Kredits
    document.getElementById('player-hq').textContent = state.player.hp;
    document.getElementById('player-kredits').textContent = state.player.kredits;
    document.getElementById('player-kredits-max').textContent = state.player.kreditsMax;
    document.getElementById('player-deck-count').textContent = state.player.deck.length;

    document.getElementById('opponent-hq').textContent = state.opponent.hp;
    document.getElementById('opponent-kredits').textContent = state.opponent.kredits;
    document.getElementById('opponent-kredits-max').textContent = state.opponent.kreditsMax;
    document.getElementById('opponent-deck-count').textContent = state.opponent.deck.length;

    // 渲染手牌
    renderHand(state.player.hand, 'player-hand', true);
    renderHand(state.opponent.hand, 'opponent-hand', false);

    // 渲染战场
    renderZone(state.player.supportLine, 'player-support');
    renderZone(state.opponent.supportLine, 'opponent-support');
    renderZone(state.frontline.units, 'frontline');

    // 按钮状态
    const endTurnBtn = document.getElementById('end-turn-btn');
    endTurnBtn.disabled = state.currentPlayer !== 'player';
}

function renderHand(hand, elementId, isPlayer) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    
    hand.forEach(card => {
        const cardEl = createCardElement(card);
        if (!isPlayer) {
            cardEl.classList.add('card-back');
            cardEl.innerHTML = '<div style="width:100%;height:100%;background:#4a3b2a;border-radius:4px;"></div>'; // 简单的卡背
        } else {
            // 玩家手牌点击事件
            cardEl.onclick = () => {
                if (state.currentPlayer !== 'player') return;
                if (state.selectedCard === card) {
                    state.selectedCard = null;
                    cardEl.style.transform = '';
                } else {
                    state.selectedCard = card;
                    // 简单的视觉反馈，实际应在 render 中处理选中态
                    render(); // 重新渲染以应用选中样式（未实现选中样式，暂时不做）
                    // 尝试直接打出（如果有目标选择则需要两步，这里简化为点击即尝试打出到后排）
                    if (card.type === 'unit') {
                        playCard(state.player, card);
                    }
                }
            };
        }
        container.appendChild(cardEl);
    });
}

function renderZone(units, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    
    units.forEach(unit => {
        const unitEl = document.createElement('div');
        unitEl.className = 'unit';
        if (unit.hasAttacked || unit.isDeployedThisTurn && !unit.traits.includes('blitz')) {
            unitEl.classList.add('exhausted');
        }
        if (unit === state.selectedUnit) {
            unitEl.classList.add('selected');
        }
        
        // 单位卡牌的简化版
        unitEl.innerHTML = `
            <div class="card ${unit.nation}" style="width:100px;height:130px;">
                <div class="card-cost">${unit.opCost}</div>
                <div class="card-image" style="height:60px;">${unit.image}</div>
                <div class="card-name">${unit.name}</div>
                <div class="card-stats">
                    <span class="stat-attack">${unit.attack}</span>
                    <span class="stat-defense">${unit.currentHp}</span>
                </div>
            </div>
        `;
        
        // 点击事件：移动或攻击
        unitEl.onclick = () => handleUnitClick(unit);

        container.appendChild(unitEl);
    });
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card ${card.nation}`;
    el.innerHTML = `
        <div class="card-cost">${card.cost}</div>
        <div class="card-image">${card.image}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-type">${card.type === 'unit' ? '单位' : '指令'}</div>
        <div class="card-text">${card.text}</div>
        ${card.type === 'unit' ? `
        <div class="card-stats">
            <span class="stat-attack">${card.attack}</span>
            <span class="stat-defense">${card.defense}</span>
        </div>` : ''}
    `;
    return el;
}

// 交互逻辑
function handleUnitClick(unit) {
    if (state.currentPlayer !== 'player') return;
    
    // 既然是简化版，我们定义点击逻辑如下：
    // 1. 如果没有选中单位，且点击的是己方单位 -> 选中它
    // 2. 如果选中了己方单位：
    //    a. 点击的是前线空位 -> 移动
    //    b. 点击的是敌方单位 -> 攻击
    //    c. 点击的是自己 -> 取消选中
    
    const isMine = state.player.supportLine.includes(unit) || (state.frontline.units.includes(unit) && state.frontline.controller === 'player');
    const isEnemy = state.opponent.supportLine.includes(unit) || (state.frontline.units.includes(unit) && state.frontline.controller === 'opponent');
    
    if (state.selectedUnit === null) {
        if (isMine) {
            state.selectedUnit = unit;
            log(`选中了 ${unit.name}`);
            // 高亮选中（未实现 CSS）
        }
    } else {
        if (unit === state.selectedUnit) {
            state.selectedUnit = null;
            log("取消选中");
        } else if (isMine) {
            state.selectedUnit = unit; // 切换选中
            log(`切换选中为 ${unit.name}`);
        } else if (isEnemy) {
            attack(state.player, state.selectedUnit, state.opponent, unit);
            state.selectedUnit = null;
        }
    }
    render();
}

// 处理前线点击（用于移动到空前线）
document.getElementById('frontline').onclick = (e) => {
    // 防止冒泡触发单位点击
    if (e.target.closest('.unit')) return;
    
    if (state.currentPlayer === 'player' && state.selectedUnit) {
        // 尝试移动
        const inSupport = state.player.supportLine.includes(state.selectedUnit);
        if (inSupport) {
            moveUnit(state.player, state.selectedUnit, 'support', 'frontline');
            state.selectedUnit = null;
            render();
        }
    }
};

// 处理敌方头像点击（攻击 HQ）
document.querySelector('#opponent-area .avatar').onclick = () => {
    if (state.currentPlayer === 'player' && state.selectedUnit) {
        attack(state.player, state.selectedUnit, state.opponent, null);
        state.selectedUnit = null;
        render();
    }
};

// 结束回合按钮
document.getElementById('end-turn-btn').onclick = endTurn;

// 消息提示
function log(msg, persistent = false) {
    console.log(msg);
    const el = document.getElementById('game-message');
    el.textContent = msg;
    const overlay = document.getElementById('modal-overlay');
    
    if (persistent) {
        overlay.classList.remove('hidden');
    } else {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            const entry = document.createElement('div');
            entry.textContent = msg;
            entry.style.marginBottom = '4px';
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }
}

// 启动
window.onload = initGame;
