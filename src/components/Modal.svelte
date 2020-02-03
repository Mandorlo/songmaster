<script>
export let title = 'Modal title';
export let content = '';
export let modalid = 'modal' + ~~(Math.random()*1000);
export let show = false;
</script>

<div id={modalid} class="modal" tabindex="-1" role="dialog" style="display:{show ? 'flex': 'none'}" on:click={_ => show = false}>
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{title}</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true" on:click={_ =>show = false}>&times;</span>
        </button>
      </div>
      <div class="modal-body">
        {#if content !== ''}
            {@html content}
        {:else}
            <slot></slot>
        {/if}
      </div>
      <!-- <div class="modal-footer">
        <button type="button" class="btn btn-primary">Save changes</button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
      </div> -->
    </div>
  </div>
</div>

<style>
.modal {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #b3b3b375;
}

.modal-dialog {
  max-width: 600px;
  font-family: Baskerville;
}
.modal-content {
  background: hsla(39, 100%, 99%, 1);
  color: #33364e;
}
button.close {
  color: var(--wheat);
}
@media screen and (min-width: 800px) {
  .modal-body {
    padding: 5rem;
  }
}
</style>