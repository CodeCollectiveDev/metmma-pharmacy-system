<template>
  <header>
    <div class="left">
      <p>Pharmacy System</p>
      <button class="search-btn">Search Bar</button>
    </div>

    <div class="right">
      <button class="nav-btn">Profile</button>
      <button class="nav-btn">Inventory</button>
      <button class="nav-btn">Point of Sale</button>
    </div>
  </header>
</template>

<script>
export default {
  name: "HeaderBar",
};
</script>

<style scoped>
body{
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f4f6fa;
}

header{
  background: #2c7bea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.2);
}

.left,
.right{
  display: flex;
  align-items: center;
  gap: 10px;
}

header p{
  font-size: 22px;
  font-weight: bold;
  margin: 0;
}

button{
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.search-btn{
  background: white;
  color: #2c7bea;
  font-weight: bold;
}

.nav-btn{
  background: rgba(255,255,255,0.2);
  color: white;
}

.nav-btn:hover{
  background: rgba(255,255,255,0.4);
}
</style>
