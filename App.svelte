<script>
  import "bulma/bulma.sass";
  import QrScanner from "qr-scanner";
  import {isValidIBAN, friendlyFormatIBAN, validateIBAN, electronicFormatIBAN} from "ibantools";

  let iban = "";
  let bic_swift = "";
  let bank;

  let name = "";
  let address = "";
  let address_complement = "";
  let zip = "";
  let city = "";
  let state = "";
  let country = "CH";

  let amount = "200.00";
  let currency = "CHF";
  let reference = "";

  let estimate;

  let iban_valid;
  $: iban_valid = validateIBAN(iban);

  $: if (isValidIBAN(iban)) {
    const country = iban.slice(0, 2);

    // see https://en.wikipedia.org/wiki/International_Bank_Account_Number#IBAN_formats_by_country
    let bankCode;
    if (country === "AT") bankCode = iban.substring(4, 9);
    else if (country === "BE") bankCode = iban.substring(4, 7);
    else if (country === "DE") bankCode = iban.substring(4, 12);
    else if (country === "ES") bankCode = iban.substring(4, 8);
    else if (country === "FR") bankCode = iban.substring(4, 9);
    else if (country === "LU") bankCode = iban.substring(4, 7);
    else if (country === "NL") bankCode = iban.substring(4, 8);

    const baseUrl = "https://raw.githubusercontent.com/sigalor/iban-to-bic/main/datasets-extended";
    fetch(`${baseUrl}/${country.toLowerCase()}.json`)
      .then((result) => result.json())
      .then((data) => {
        console.log(bankCode);
        console.log(data);

        bic_swift = data[bankCode].bic;
        bank = data[bankCode].name;
      });
  }

  $: estimate = fetch("https://exchange.api.bity.com/v2/orders/estimate", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      input: {currency: "BTC"},
      output: {currency, amount},
    }),
  }).then((response) => response.json());

  async function handleFile(e) {
    const result = await QrScanner.scanImage(e.target.files[0], {returnDetailedScanResult: true});
    const lines = result.data.split("\n");

    console.log(lines);

    iban = lines[3];
    name = lines[5];

    if (lines[4] == "K") {
      address = lines[6];
      [zip, city] = lines[7].split(" ", 2);
    }

    if (lines[4] == "S") {
      address = `${lines[6]} ${lines[7]}`;
      zip = lines[8];
      city = lines[9];
    }

    country = lines[10];
  }

  async function submit() {
    try {
      const response = await fetch("https://exchange.api.bity.com/v2/orders", {
        credentials: "include",
        method: "POST",
        mode: "cors",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          input: {currency: "BTC"},
          output: {
            iban,
            bic_swift,
            amount,
            currency,
            owner: {name, address, address_complement, zip, city, state, country},
            type: "bank_account",
            reference,
          },
        }),
      });
      console.log(typeof response, response);

      const location = response.headers.get("Location");
      console.log(typeof location, location);

      const response2 = await fetch(`https://exchange.api.bity.com${location}`, {
        credentials: "include",
        method: "GET",
        mode: "cors",
      });
      const order = await response2.json();

      console.log(typeof order, order);
    } catch (error) {
      console.log(typeof error, error);
    }
  }
</script>

<section class="hero is-small is-info">
  <div class="hero-body">
    <div class="container has-text-centered">
      <p class="title">Pay bills online with Bitcoin</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="container is-max-desktop">
    <div class="level">
      <div class="level-left" />
      <div class="level-right">
        <div class="file is-normal">
          <label class="file-label">
            <input class="file-input" type="file" on:change={handleFile} />
            <span class="file-cta">
              <span class="file-icon"><i class="fas fa-upload" /></span>
              <span class="file-label">Scan file</span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label for="input-iban" class="label">IBAN</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input
              id="input-iban"
              class="input {!iban_valid.valid && 'is-danger'}"
              type="text"
              value={friendlyFormatIBAN(iban)}
              on:keyup={(e) => (iban = electronicFormatIBAN(e.target.value))}
            />
          </div>
          {#if !iban_valid.valid}
            <p class="help is-danger">{iban_valid.errorCodes}</p>
          {:else if bank}
            <p class="help">{bank}</p>
          {/if}
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label for="input-bic" class="label">BIC / SWIFT</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input id="input-bic" class="input" type="text" bind:value={bic_swift} />
          </div>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label for="input-name" class="label">Name</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input id="input-name" class="input" type="text" bind:value={name} />
          </div>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label for="input-address" class="label">Adresse</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input id="input-address" class="input" type="text" bind:value={address} />
          </div>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">PLZ, Ort</label>
      </div>
      <div class="field-body">
        <div class="field is-expanded">
          <div class="field has-addons">
            <p class="control">
              <input id="input-zip" class="input" type="text" bind:value={zip} />
            </p>
            <p class="control is-expanded">
              <input id="input-city" class="input" type="text" bind:value={city} />
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Land</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <div class="select is-fullwidth">
              <select bind:value={country}>
                <optgroup>
                  <option value="CH">Switzerland</option>
                  <option value="DE">Germany</option>
                </optgroup>
                <optgroup>
                  <option value="LI">Liechtenstein</option>
                  <option value="FR">France</option>
                  <option value="AT">Austria</option>
                  <option value="BE">Belgium</option>
                  <option value="HR">Croatia</option>
                  <option value="CY">Cyprus</option>
                  <option value="EE">Estonia</option>
                  <option value="FI">Finland</option>
                  <option value="GR">Greece</option>
                  <option value="IE">Ireland</option>
                  <option value="IT">Italy</option>
                  <option value="LV">Latvia</option>
                  <option value="LT">Lithuania</option>
                  <option value="LU">Luxembourg</option>
                  <option value="MT">Malta</option>
                  <option value="NL">Netherlands</option>
                  <option value="PT">Portugal</option>
                  <option value="SK">Slovakia</option>
                  <option value="SI">Slovenia</option>
                  <option value="ES">Spain</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <hr />

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Betrag</label>
      </div>
      <div class="field-body">
        <div class="field has-addons">
          <div class="control is-expanded">
            <input class="input" type="text" bind:value={amount} />
            {#await estimate}
              <p class="help">...</p>
            {:then value}
              <p class="help">= {(value.input.amount * 100_000_000).toLocaleString()} sats</p>
            {:catch error}
              <p class="help is-danger">{error.message}</p>
            {/await}
          </div>
          <p class="control">
            <span class="select">
              <select bind:value={currency}>
                <option>CHF</option>
                <option>EUR</option>
              </select>
            </span>
          </p>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Referenz</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input class="input" type="text" bind:value={reference} />
          </div>
        </div>
      </div>
    </div>

    <hr />

    <p class="control">
      <button class="button is-primary" on:click={submit}>Submit</button>
    </p>
  </div>
</section>

<footer class="footer">
  <div class="content has-text-centered">
    <p>
      Built with the <a
        target="_blank"
        rel="noreferrer"
        href="https://bity.com/products/crypto-exchange-api/">Bity Crypto Exchange API</a
      >.
    </p>
  </div>
</footer>
